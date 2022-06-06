import torch
import pydiffvg
import time
from util.processing import get_augment_trans

# from util.loss import CLIPConvLoss2
from util.utils import area_mask
from util.render_design import rescale_constants, calculate_draw_region, UserSketch
from util.render_design import add_shape_groups, treebranch_initialization
from util.clip_utility import get_noun_data, parse_svg
import logging
import asyncio
import aiofiles


class Drawer:
    def __init__(self, clip, websocket, exemplar_count=None):
        """These inputs are defaults and can have methods for setting them after the inital start up"""

        self.clip_interface = clip
        self.model = clip.model
        self.exemplar_count = exemplar_count
        # self.nouns_features = noun_features
        self.socket = websocket
        self.is_running = False
        self.nouns = get_noun_data()
        self.is_initialised = False
        self.use_neg_prompts = False
        self.normalize_clip = True
        # Canvas parameters
        self.num_paths = 50
        self.max_width = 40
        self.canvas_h = 224
        self.canvas_w = 224
        # Algorithm parameters
        self.num_iter = 1001
        self.w_points = 0.01
        self.w_colors = 0.1
        self.w_widths = 0.01
        self.w_img = 0.01
        self.w_full_img = 0.001
        self.drawing_area = {'x0': 0.0, 'x1': 1.0, 'y0': 0.0, 'y1': 1.0}
        self.iteration = 0
        self.num_augs = 4
        self.update_frequency = 1 # remove?
        self.frame_size = None
        self.refresh_rate = 15
        # Configure rasterisor
        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        pydiffvg.set_print_timing(False)
        pydiffvg.set_use_gpu(torch.cuda.is_available())
        pydiffvg.set_device(self.device)
        # self.clipConvLoss = CLIPConvLoss2(self.device)
        return

    def reset(self):
        self.text_features = []
        self.neg_text_features = []
        self.iteration = 0

    def set_text_features(self, text_features, neg_text_features=[]):
        self.text_features = text_features
        self.neg_text_features = neg_text_features
        logging.info("Updated CLIP prompt features")
        return

    def parse_svg(self, region=None):
        use_region = region['activate']
        try:
            (
                self.path_list,
                self.user_canvas_w,
                self.user_canvas_h,
                self.resizeScaleFactor,
                normaliseScaleFactor,
            ) = parse_svg('data/interface_paths.svg', use_region)

            if use_region:
                self.drawing_area = calculate_draw_region(region, normaliseScaleFactor)
        except Exception as e:
            logging.error(e)
            logging.error("SVG Parsing failed")

    def initialise_without_treebranch(self):
        user_sketch = UserSketch(self.path_list, self.canvas_w, self.canvas_h)
        self.shapes = user_sketch.shapes
        self.shape_groups = user_sketch.shape_groups
        self.num_sketch_paths = len(user_sketch.shapes)
        self.augment_trans = get_augment_trans(self.canvas_w, self.normalize_clip)
        self.user_sketch = user_sketch
        logging.info("Initialised shapes")      

    def activate_without_curves(self):
        self.is_active = True
        self.initialise_without_treebranch()
        self.initialize_variables()
        self.initialize_optimizer()
        
    def activate(self):
        self.is_active = True
        self.initialize_shapes()
        self.initialize_variables()
        self.initialize_optimizer()

    def initialize_shapes(self):
        user_sketch = UserSketch(self.path_list, self.canvas_w, self.canvas_h)
        shapes_rnd, shape_groups_rnd = treebranch_initialization(
            self.path_list,
            self.num_paths,
            self.canvas_w,
            self.canvas_h,
            self.drawing_area,
        )
        self.shapes = user_sketch.shapes + shapes_rnd
        self.shape_groups = add_shape_groups(user_sketch.shape_groups, shape_groups_rnd)
        self.num_sketch_paths = len(user_sketch.shapes)
        self.augment_trans = get_augment_trans(self.canvas_w, self.normalize_clip)
        self.user_sketch = user_sketch
        logging.info("Initialised shapes")

    def initialize_variables(self):
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
        self.render = pydiffvg.RenderFunction.apply
        self.mask = area_mask(self.canvas_w, self.canvas_h, self.drawing_area).to(
            self.device
        )
        self.user_sketch.init_vars()
        self.points_vars0 = self.user_sketch.points_vars
        self.stroke_width_vars0 = self.user_sketch.stroke_width_vars
        self.color_vars0 = self.user_sketch.color_vars
        self.img0 = self.user_sketch.img
        logging.info("Initialised vars")

    def initialize_optimizer(self):
        self.points_optim = torch.optim.Adam(self.points_vars, lr=0.5)
        self.width_optim = torch.optim.Adam(self.stroke_width_vars, lr=0.1)
        self.color_optim = torch.optim.Adam(self.color_vars, lr=0.01)
        logging.info("Initialised Optimisers")

    def build_img(self, shapes, shape_groups, t):
        scene_args = pydiffvg.RenderFunction.serialize_scene(
            self.canvas_w, self.canvas_h, shapes, shape_groups
        )
        img = self.render(self.canvas_w, self.canvas_h, 2, 2, t, None, *scene_args)
        img = img[:, :, 3:4] * img[:, :, :3] + torch.ones(
            img.shape[0], img.shape[1], 3, device=pydiffvg.get_device()
        ) * (1 - img[:, :, 3:4])
        img = img[:, :, :3].unsqueeze(0).permute(0, 3, 1, 2)  # NHWC -> NCHW
        return img

    async def run_epoch(self):
        t = self.iteration
        logging.info(f"Starting run {t} in drawer {str(self.exemplar_count)}")

        self.points_optim.zero_grad()
        self.width_optim.zero_grad()
        self.color_optim.zero_grad()

        img = self.build_img(self.shapes, self.shape_groups, t)

        img_loss = (
            torch.norm((img - self.img0) * self.mask)
            if self.w_img > 0
            else torch.tensor(0, device=self.device)
        )

        self.img = img.permute(0, 2, 3, 1).squeeze(0)

        loss = 0

        img_augs = []
        for n in range(self.num_augs):
            img_augs.append(self.augment_trans(img))
        im_batch = torch.cat(img_augs)
        img_features = self.model.encode_image(im_batch)
        for n in range(self.num_augs):
            loss -= torch.cosine_similarity(
                self.text_features, img_features[n : n + 1], dim=1
            )
            if self.use_neg_prompts:
                loss += (
                    torch.cosine_similarity(
                        self.text_features_neg1, img_features[n : n + 1], dim=1
                    )
                    * 0.3
                )
                loss += (
                    torch.cosine_similarity(
                        self.text_features_neg2, img_features[n : n + 1], dim=1
                    )
                    * 0.3
                )
        self.img_features = img_features

        points_loss = 0
        widths_loss = 0
        colors_loss = 0

        for k, points0 in enumerate(self.points_vars0):
            points_loss += torch.norm(self.points_vars[k] - points0)
            colors_loss += torch.norm(self.color_vars[k] - self.color_vars0[k])
            widths_loss += torch.norm(
                self.stroke_width_vars[k] - self.stroke_width_vars0[k]
            )

        loss += self.w_points * points_loss
        loss += self.w_colors * colors_loss
        loss += self.w_widths * widths_loss
        loss += self.w_img * img_loss

        # geo_loss = self.clipConvLoss(img * self.mask + 1 - self.mask, self.img0)

        # for l_name in geo_loss:
        #     loss += self.w_geo * geo_loss[l_name]
        # loss += self.w_geo * geo_loss['clip_conv_loss_layer3']

        # Backpropagate the gradients.
        loss.backward()

        # Take a gradient descent step.
        self.points_optim.step()
        self.width_optim.step()
        self.color_optim.step()
        for path in self.shapes:
            path.stroke_width.data.clamp_(1.0, self.max_width)
        for group in self.shape_groups:
            group.stroke_color.data.clamp_(0.0, 1.0)

        self.losses = {
            'global': loss,
            'points': points_loss,
            'widhts': widths_loss,
            'colors': colors_loss,
            'image': img_loss,
            # 'geometric': geo_loss,
        }

        # Update sketch
        if t % self.refresh_rate == 0:
            if self.exemplar_count is not None:
                self.resizeScaleFactor = 224 / self.frame_size

            render_shapes, render_shape_groups = rescale_constants(
                self.shapes, self.shape_groups, self.resizeScaleFactor
            )
            pydiffvg.save_svg(
                f"results/output-{str(self.exemplar_count)}.svg",
                self.user_canvas_w,
                self.user_canvas_h,
                render_shapes,
                render_shape_groups,
            )
            try: 
                logging.info("Sending...")
                svg = ''
                async with aiofiles.open(
                    f"results/output-{str(self.exemplar_count)}.svg", "r"
                    ) as f:
                    svg = await f.read()
                status = "draw"
                if isinstance(self.exemplar_count, int):
                    logging.info(f"Sending exemplar {self.exemplar_count}")
                    status = str(self.exemplar_count)
                result = {"status": status, "svg": svg, "iterations": t, "loss": loss.item(), "exemplar_index": self.exemplar_count}
                self.last_result = result  # won't go to client unless continued is used
                await self.socket.send_json(result)
                logging.info("Sent update")
            except Exception as e:
                logging.error("WS Response Failed")

        logging.info(f"Completed run {t} in drawer {str(self.exemplar_count)}")
        self.iteration += 1

    # RUN STUFF
    async def draw_update(self, data):
        """Use current paths with the given (possibly different) prompt to generate options"""
        logging.info("Updating...")
        prompt = data["data"]["prompt"]
        neg_prompt = []
        svg_string = data["data"]["svg"]
        region = data["data"]["region"]
        self.clip_interface.positive = prompt
        if svg_string is not None:
            async with aiofiles.open('data/interface_paths.svg', 'w') as f:
                await f.write(svg_string)
        # write svg even if no paths so other stuff can be parsed
        # Can't remeber why added empty svg
        # else:
        #     async with aiofiles.open('data/interface_paths.svg', 'w') as f:
        #         await f.write("")
        try:
            self.reset()
            logging.info("Starting clip drawer")
            prompt_features = self.clip_interface.encode_text_classes([prompt])
            neg_prompt_features = self.clip_interface.encode_text_classes(neg_prompt)
            self.set_text_features(prompt_features, neg_prompt_features)
            self.last_region = region
            self.num_paths = data["data"]["random_curves"]
            self.parse_svg(region)
            logging.info("Got features")
            return self.activate()
        except Exception as e:
            logging.error(e)
            logging.error("Failed to encode features in clip")

    async def redraw_update(self):
        """Use original paths with origional prompt to try new options from same settings"""
        logging.info("Starting redraw")
        self.parse_svg(self.last_region)
        self.iteration = 0
        return self.activate()

    async def continue_update(self, data):
        """Keep the last drawer running"""
        logging.info("Continuing...")
        prompt = data["data"]["prompt"]
        neg_prompt = []
        try:
            if prompt == self.clip_interface.positive:
                await self.socket.send_json(self.last_result)
            else:
                self.clip_interface.positive = prompt
                prompt_features = self.clip_interface.encode_text_classes([prompt])
                neg_prompt_features = self.clip_interface.encode_text_classes(
                    neg_prompt
                )
                self.set_text_features(prompt_features, neg_prompt_features)
                logging.info("Continuing with new prompt")
        except Exception as e:
            logging.error(e)
            logging.error("Failed to encode features in clip")

    async def continue_update_sketch(self, data):
        # fix initialise
        """Keep the last drawer running"""
        logging.info("Continuing with new sketch...")

        svg_string = data["data"]["svg"]
        print(svg_string)
        if svg_string is not None:
            async with aiofiles.open('data/interface_paths.svg', 'w') as f:
                await f.write(svg_string)
        try:
            self.parse_svg(self.last_region)

            # activate without reinitialise
            return self.activate_without_curves()
        except Exception as e:
            logging.error(e)
            logging.error("Failed to parse the new sketch")

    async def stop(self):
        logging.info("Stopping...")
        self.is_running = False
        await self.socket.send_json({"status": "stop"})

    def run_async(self):
        self.is_running = True  # for loop to continue
        loop = asyncio.get_running_loop()
        loop.run_in_executor(None, lambda: asyncio.run(self.loop()))

    async def loop(self):
        while self.is_running:
            logging.info(f"Running iteration {self.iteration}...")
            await self.run_epoch()
