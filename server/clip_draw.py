import torch
import pydiffvg
import torchvision.transforms as transforms
import datetime
import numpy as np
# make a util directory???
from clip_util import *
from render_design import *
import logging
import pickle

class Clip_Draw_Optimiser:
    __instance = None
    def __init__(self, model, noun_features):
        """These inputs are defaults and can have methods for setting them after the inital start up"""
        
        if Clip_Draw_Optimiser.__instance != None:  # Should be refactored since only used once?
            raise Exception("Clip is already instantiated.")
        
        # Set up
        self.model = model
        self.nouns_features = noun_features
        self.nouns = get_noun_data()
        self.is_initialised = False
        self.use_user_paths = True
        self.is_active = False
        self.use_neg_prompts = False
        self.normalize_clip = True
        # Canvas parameters
        self.num_paths = 32
        self.max_width = 40
        self.render_canvas_h = 224
        self.render_canvas_w = 224
        # Algorithm parameters
        self.num_iter = 1001
        self.w_points = 0.01
        self.w_colors = 0.1
        self.w_widths = 0.01
        self.w_img = 0.01
        self.w_full_img = 0.001
        self.drawing_area = {
            'x0': 0.0,
            'x1': 1.0,
            'y0': 0.0,
            'y1': 1.0
        }
        self.update_frequency = 1
        # Configure rasterisor
        device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        pydiffvg.set_print_timing(False)
        pydiffvg.set_use_gpu(torch.cuda.is_available())
        pydiffvg.set_device(device)
        logging.info("Drawer ready")

        Clip_Draw_Optimiser.__instance == self 
        return 

    def reset(self):
        self.text_features = []
        self.neg_text_features = []
        self.iteration = 0
    
    def set_text_features(self, text_features, neg_text_features = []):
        self.text_features = text_features
        self.neg_text_features = neg_text_features
        logging.info("Updated CLIP prompt features")
        return

    # HOW TO ABORT WITH NEW PROMPT?
    def activate(self):        
        self.is_active = True
        device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        logging.info('Parsing SVG paths')

        path_list = []
        try:
            if self.use_user_paths:
                path_list, width, height, resizeScaleFactor = parse_svg('data/interface_paths.svg')
                # self.frame_size = frame_size
                self.user_canvas_w = width
                self.user_canvas_h = height
                self.resizeScaleFactor = resizeScaleFactor
            else:
                path_list = parse_local_svg('data/drawing_flower_vase.svg')
        except:
            logging.error("SVG Parsing failed")

        logging.info('Transforming')
        if self.normalize_clip:
            self.augment_trans = transforms.Compose([
            transforms.RandomPerspective(fill=1, p=1, distortion_scale=0.5),
            transforms.RandomResizedCrop(self.render_canvas_w, scale=(0.7,0.9)),
            transforms.Normalize((0.48145466, 0.4578275, 0.40821073), (0.26862954, 0.26130258, 0.27577711))]) 
        else: 
            self.augment_trans = transforms.Compose([
            transforms.RandomPerspective(fill=1, p=1, distortion_scale=0.5),
            transforms.RandomResizedCrop(self.render_canvas_w, scale=(0.7,0.9))])

        logging.info('Setting up og curves')

        shapes, shape_groups = render_save_img(path_list, self.render_canvas_w, self.render_canvas_h)
        
        self.mask = area_mask(
            self.render_canvas_w,
            self.render_canvas_h,
            self.drawing_area['x0'],
            self.drawing_area['x1'],
            self.drawing_area['y0'],
            self.drawing_area['y1'],
            ).to(device)

        shapes_rnd, shape_groups_rnd = treebranch_initialization(
            path_list,
            self.num_paths,
            self.render_canvas_w,
            self.render_canvas_h,
            self.drawing_area
            )

        # Combine
        self.shapes = shapes + shapes_rnd
        self.shape_groups = add_shape_groups(shape_groups, shape_groups_rnd)

        points_vars, stroke_width_vars, color_vars = initialise_gradients(self.shapes, self.shape_groups)
        self.points_vars = points_vars
        self.stroke_width_vars = stroke_width_vars
        self.color_vars = color_vars

        user_scene_args = pydiffvg.RenderFunction.serialize_scene(
            self.render_canvas_w, self.render_canvas_h, shapes, shape_groups)
        render = pydiffvg.RenderFunction.apply

        user_points_vars, user_stroke_width_vars, user_color_vars = initialise_gradients(shapes, shape_groups)
        user_img = render(self.render_canvas_w, self.render_canvas_h, 2, 2, 0, None, *user_scene_args)
        user_img = user_img[:, :, 3:4] * user_img[:, :, :3] + torch.ones(user_img.shape[0], user_img.shape[1], 3, device = pydiffvg.get_device()) * (1 - user_img[:, :, 3:4])
        with open('tmp/img0.pkl', 'wb+') as f:
            pickle.dump(user_img, f)
        with open('tmp/points_vars.pkl', 'wb+') as f:
            pickle.dump(user_points_vars, f)
        with open('tmp/stroke_width_vars.pkl', 'wb+') as f:
            pickle.dump(user_stroke_width_vars, f)
        with open('tmp/color_vars.pkl', 'wb+') as f:
            pickle.dump(user_color_vars, f)
        
        self.points_vars0, self.stroke_width_vars0, self.color_vars0, self.img0 = load_vars()
        scene_args = pydiffvg.RenderFunction.serialize_scene(\
            self.render_canvas_w, self.render_canvas_h, self.shapes, self.shape_groups)
        self.render = pydiffvg.RenderFunction.apply

        logging.info('Setting optimisers')
        self.points_optim = torch.optim.Adam(self.points_vars, lr=0.5)
        self.width_optim = torch.optim.Adam(self.stroke_width_vars, lr=0.1)
        self.color_optim = torch.optim.Adam(self.color_vars, lr=0.01)
        self.time_str = datetime.datetime.today().strftime("%Y_%m_%d_%H_%M_%S")
        
    def run_iteration(self):
        device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu") #REFACTORRRRRR
        if self.iteration > self.num_iter:
            return -1
        logging.info(self.iteration)

        self.points_optim.zero_grad()
        self.width_optim.zero_grad()
        self.color_optim.zero_grad()
        scene_args = pydiffvg.RenderFunction.serialize_scene(\
            self.render_canvas_w, self.render_canvas_h, self.shapes, self.shape_groups)
        self.img = self.render(self.render_canvas_w, self.render_canvas_h, 2, 2, self.iteration, None, *scene_args)
        self.img = self.img[:, :, 3:4] * self.img[:, :, :3] + torch.ones(self.img.shape[0], self.img.shape[1], 3, device = pydiffvg.get_device()) * (1 - self.img[:, :, 3:4])
        if self.w_img >0:
            self.l_img = torch.norm((self.img-self.img0.to(device))*self.mask).view(1)
        else:
            self.l_img = torch.tensor([0], device=device)

        self.img = self.img[:, :, :3]
        self.img = self.img.unsqueeze(0)
        self.img = self.img.permute(0, 3, 1, 2) # NHWC -> NCHW

        loss = 0
        loss += self.w_img*(self.l_img.item())
        NUM_AUGS = 4
        self.img_augs = []
        for n in range(NUM_AUGS):
            self.img_augs.append(self.augment_trans(self.img))
        im_batch = torch.cat(self.img_augs)
        image_features = self.model.encode_image(im_batch)
        for n in range(NUM_AUGS):
            loss -= torch.cosine_similarity(self.text_features, image_features[n:n+1], dim=1)
            if self.use_neg_prompts:
                loss += torch.cosine_similarity(self.neg_text_features, image_features[n:n+1], dim=1) * 0.3

        # B\'ezier losses
        l_points = 0
        l_widths = 0
        l_colors = 0
        for k, points0 in enumerate(self.points_vars0):
            l_points += torch.norm(self.points_vars[k]-points0)
            l_colors += torch.norm(self.color_vars[k]-self.color_vars0[k])
            l_widths += torch.norm(self.stroke_width_vars[k]-self.stroke_width_vars0[k])

        loss += self.w_points*l_points
        loss += self.w_colors*l_colors
        loss += self.w_widths*l_widths   

        # Backpropagate the gradients.
        loss.backward()

        # Take a gradient descent step.
        self.points_optim.step() # at this point path is updated ? should be able to stream this to fe in real time
        self.width_optim.step()
        self.color_optim.step()
        for path in self.shapes:
            path.stroke_width.data.clamp_(1.0, self.max_width)
        for group in self.shape_groups:
            group.stroke_color.data.clamp_(0.0, 1.0)

        self.loss = loss.item()
        # This is just to check out the progress
        if self.iteration % self.update_frequency == 0:
            logging.info(f"render loss: {loss.item()}")
            logging.info(f"l_points: {l_points.item()}")
            logging.info(f"l_colors: {l_colors.item()}")
            logging.info(f"l_widths: {l_widths.item()}")
            logging.info(f"self.l_img: {self.l_img.item()}")
            # for l in l_style:
            #     print('l_style: ', l.item())
            with torch.no_grad():
                # pydiffvg.imwrite(self.img.cpu().permute(0, 2, 3, 1).squeeze(0), 'results/'+self.time_str+'.png', gamma=1)
                if self.nouns_features != []:
                    im_norm = image_features / image_features.norm(dim=-1, keepdim=True)
                    noun_norm = self.nouns_features / self.nouns_features.norm(dim=-1, keepdim=True)
                    similarity = (100.0 * im_norm @ noun_norm.T).softmax(dim=-1)
                    values, indices = similarity[0].topk(5)
                    logging.info("\nTop predictions:\n")
                    for value, index in zip(values, indices):
                        logging.info(f"{self.nouns[index]:>16s}: {100 * value.item():.2f}%")
                
                pydiffvg.save_svg('results/latest_rendered_paths.svg', self.render_canvas_w, self.render_canvas_h, self.shapes, self.shape_groups)
                if self.use_user_paths:
                    render_shapes, render_shape_groups = rescale_constants(self.shapes, self.shape_groups, self.resizeScaleFactor)
                    pydiffvg.save_svg('results/output.svg', self.user_canvas_w, self.user_canvas_h, render_shapes, render_shape_groups)

        self.iteration += 1
        return self.iteration, loss.item()

    def stop_drawing(self):
        # pydiffvg.imwrite(self.img.cpu().permute(0, 2, 3, 1).squeeze(0), 'results/'+self.time_str+'.png', gamma=1)
        # save_data(self.time_str, self)
        self.is_active = False
