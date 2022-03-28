import torch
import pydiffvg
import torchvision.transforms as transforms
import datetime
import numpy as np
# make a util directory???
from clip_util import get_noun_data, get_drawing_paths, area_mask, save_data, get_drawing_paths_string
from render_design import add_shape_groups, load_vars, render_save_img, build_random_curves
import logging

class Clip_Draw_Optimiser:
    __instance = None
    def __init__(self, model, noun_features):
        """These inputs are defaults and can have methods for setting them after the inital start up"""
        if Clip_Draw_Optimiser.__instance != None:  # Should this all be refactored to not be a "class instance" since it is only used once?
            raise Exception("Clip is already instantiated.")
        # Set up parent
        self.model = model
        # Partial sketch
        self.svg_path = 'data/drawing_flower_vase.svg'
        self.svg_string = ''
        # Array set as arrays
        self.text_features = []
        self.neg_text_features = []
        self.nouns_features = noun_features
        self.use_neg_prompts = False
        self.normalize_clip = True
        # Canvas parameters
        self.num_paths = 32
        self.canvas_h = 224
        self.canvas_w = 224
        self.max_width = 40
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
            'y0': 0.5,
            'y1': 1.0
        }
        self.update_frequency = 5
        self.is_stopping = False
        self.is_active = False
        self.nouns = get_noun_data()
        # Configure rasterisor
        device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        pydiffvg.set_print_timing(False)
        pydiffvg.set_use_gpu(torch.cuda.is_available())
        pydiffvg.set_device(device)
        
        # Configure image Augmentation Transformation
        if self.normalize_clip:
            self.augment_trans = transforms.Compose([
            transforms.RandomPerspective(fill=1, p=1, distortion_scale=0.5),
            transforms.RandomResizedCrop(self.canvas_w, scale=(0.7,0.9)),
            transforms.Normalize((0.48145466, 0.4578275, 0.40821073), (0.26862954, 0.26130258, 0.27577711))]) 
        else: 
            self.augment_trans = transforms.Compose([
            transforms.RandomPerspective(fill=1, p=1, distortion_scale=0.5),
            transforms.RandomResizedCrop(self.canvas_w, scale=(0.7,0.9))])
        logging.info("Drawer ready")
        Clip_Draw_Optimiser.__instance == self 
        return 

    def set_text_features(self, text_features, neg_text_features = []):
        self.text_features = text_features
        self.neg_text_features = neg_text_features
        logging.info("Updated CLIP prompt features")
        return

    def stop_clip_draw(self):
        logging.info("Stopping Clip draw")
        self.is_stopping = True

    # HOW TO ABORT WITH NEW PROMPT?
    def activate(self, use_user_paths):
        self.is_active = True
        device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        logging.info('Parsing SVG paths')

        if use_user_paths:
            # get_drawing_paths_string(self.svg_string)
            self.svg_path = 'data/interface_paths.svg'
        
        path_list = get_drawing_paths(self.svg_path, "local")
        logging.info('Configuring shapes')
        self.shapes, self.shape_groups = render_save_img(path_list, self.canvas_w, self.canvas_h)
        self.shapes_rnd, self.shape_groups_rnd = build_random_curves(
            self.num_paths,
            self.canvas_w,
            self.canvas_h,
            self.drawing_area['x0'],
            self.drawing_area['x1'],
            self.drawing_area['y0'],
            self.drawing_area['y1'],
            )
        self.shapes += self.shapes_rnd
        self.shape_groups = add_shape_groups(self.shape_groups, self.shape_groups_rnd)
        self.points_vars0, self.stroke_width_vars0, self.color_vars0, self.img0 = load_vars()

        self.points_vars = []
        self.stroke_width_vars = []
        self.color_vars = []
        for path in self.shapes:
            path.points.requires_grad = True
            self.points_vars.append(path.points)
            path.stroke_width.requires_grad = True
            self.stroke_width_vars.append(path.stroke_width)
        for group in self.shape_groups:
            group.stroke_color.requires_grad = True
            self.color_vars.append(group.stroke_color)

        logging.info('Setting up differentiable renderer')
        scene_args = pydiffvg.RenderFunction.serialize_scene(\
            self.canvas_w, self.canvas_h, self.shapes, self.shape_groups)
        self.render = pydiffvg.RenderFunction.apply

        self.mask = area_mask(
            self.canvas_w,
            self.canvas_h,
            self.drawing_area['x0'],
            self.drawing_area['x1'],
            self.drawing_area['y0'],
            self.drawing_area['y1'],
            ).to(device)

        logging.info('Setting optimisers')
        # Optimizers
        self.points_optim = torch.optim.Adam(self.points_vars, lr=0.5)
        self.width_optim = torch.optim.Adam(self.stroke_width_vars, lr=0.1)
        self.color_optim = torch.optim.Adam(self.color_vars, lr=0.01)
        logging.info('Optimisers set')

        # refactor
        self.time_str = datetime.datetime.today().strftime("%Y_%m_%d_%H_%M_%S")
        
    def run_draw_iteration(self, iteration):
        device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu") #REFACTORRRRRR
        if iteration < self.num_iter:
            return -1
        logging.info("Running draw optimiser")
        self.points_optim.zero_grad()
        self.width_optim.zero_grad()
        self.color_optim.zero_grad()
        scene_args = pydiffvg.RenderFunction.serialize_scene(\
            self.canvas_w, self.canvas_h, self.shapes, self.shape_groups)
        self.img = self.render(self.canvas_w, self.canvas_h, 2, 2, iteration, None, *scene_args)
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

        # This is just to check out the progress
        if iteration % self.update_frequency == 0:
            logging.info(f"render loss: {loss.item()}")
            logging.info(f"l_points: {l_points.item()}")
            logging.info(f"l_colors: {l_colors.item()}")
            logging.info(f"l_widths: {l_widths.item()}")
            logging.info(f"self.l_img: {self.l_img.item()}")
            # for l in l_style:
            #     print('l_style: ', l.item())
            logging.info(f"Iteration: {iteration}")
            with torch.no_grad():
                pydiffvg.imwrite(self.img.cpu().permute(0, 2, 3, 1).squeeze(0), 'results/'+self.time_str+'.png', gamma=1)
                # Calc similarity to noun classes.
                if self.nouns_features != []:
                    im_norm = image_features / image_features.norm(dim=-1, keepdim=True)
                    noun_norm = self.nouns_features / self.nouns_features.norm(dim=-1, keepdim=True)
                    similarity = (100.0 * im_norm @ noun_norm.T).softmax(dim=-1)
                    values, indices = similarity[0].topk(5)
                    logging.info("\nTop predictions:\n")
                    for value, index in zip(values, indices):
                        logging.info(f"{self.nouns[index]:>16s}: {100 * value.item():.2f}%")
        return self.shapes
            # at this point the whole thing should return to the top with new path data

    def clip_has_stopped(self):
        logging.info("Stopping clip drawer")
        pydiffvg.imwrite(self.img.cpu().permute(0, 2, 3, 1).squeeze(0), 'results/'+self.time_str+'.png', gamma=1)
        save_data(self.time_str, self)
        self.is_active = False
        self.is_stopping = False
        logging.info("Drawer ready for restart")
        return



           # def use_svg_from_file(self, path_input):
    #     return
