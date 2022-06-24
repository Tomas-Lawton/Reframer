import copy
import torch
import pydiffvg
from util.processing import get_augment_trans
from util.loss import CLIPConvLoss2
from util.utils import area_mask, use_penalisation, k_max_elements
from util.render_design import rescale_constants, calculate_draw_region, UserSketch
from util.render_design import add_shape_groups, treebranch_initialization
from util.clip_utility import get_noun_data, parse_svg, shapes2paths

import logging
import asyncio


class CICADA:
    def __init__(self, clip, websocket, sketch_reference_index=None):
        """These inputs are defaults and can have methods for setting them after the inital start up"""

        self.clip_interface = clip
        self.model = clip.model
        self.sketch_reference_index = sketch_reference_index
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
        self.w_geo = 10
        self.drawing_area = {'x0': 0.0, 'x1': 1.0, 'y0': 0.0, 'y1': 1.0}
        self.prune_places = [round(self.num_iter * (k + 1) * 0.8 / 1) for k in range(1)]
        self.p0 = 0.4
        self.prune_ratio = self.p0 / len(self.prune_places)
        self.iteration = 0
        self.num_augs = 4
        self.update_frequency = 1  # remove?
        self.frame_size = None
        self.refresh_rate = 10
        self.num_user_paths = None  # add AI paths
        # Configure rasterisor
        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        pydiffvg.set_print_timing(False)
        pydiffvg.set_use_gpu(torch.cuda.is_available())
        pydiffvg.set_device(self.device)
        self.clipConvLoss = CLIPConvLoss2(self.device)
        return

    def reset(self):
        self.text_features = []
        self.neg_text_features = []
        self.iteration = 0
        self.num_user_paths = None

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
            logging.info("Parsed SVG")
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

    def update_user_paths(self):
        for i, path in enumerate(self.path_list):
            if i < self.num_user_paths:
                path.is_tied = True
            else:
                path.is_tied = False

    def activate_without_curves(self):
        self.is_active = True
        self.update_user_paths()
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
        try:
            self.path_list += shapes2paths(shapes_rnd, shape_groups_rnd, False)
        except Exception as e:
            logging.error("Problem adding to the path list")

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
        self.points_vars0 = copy.deepcopy(self.points_vars)
        self.stroke_width_vars0 = copy.deepcopy(self.stroke_width_vars)
        self.color_vars0 = copy.deepcopy(self.color_vars)
        for k in range(len(self.color_vars0)):
            self.points_vars0[k].requires_grad = False
            self.stroke_width_vars0[k].requires_grad = False
            self.color_vars0[k].requires_grad = False
        self.img0 = copy.deepcopy(self.user_sketch.img)
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

    def prune(self):
        prune_ratio = self.prune_ratio
        with torch.no_grad():

            # Get points of tied traces
            tied_points = []
            for p, path in enumerate(self.path_list):
                if path.is_tied:
                    tied_points += [
                        x.unsqueeze(0)
                        for i, x in enumerate(self.shapes[p].points)
                        if i % 3 == 0
                    ]  # only points the path goes through

            # Compute distances
            dists = []
            if tied_points:
                tied_points = torch.cat(tied_points, 0)
                for p, path in enumerate(self.path_list):
                    if path.is_tied:
                        dists.append(-1000)
                    else:
                        points = [
                            x.unsqueeze(0)
                            for i, x in enumerate(self.shapes[p].points)
                            if i % 3 == 0
                        ]  # only points the path goes through
                        min_dists = []
                        for point in points:
                            d = torch.norm(point - tied_points, dim=1)
                            d = min(d)
                            min_dists.append(d.item())

                        dists.append(min(min_dists))

            # Compute losses
            losses = []
            for p, path in enumerate(self.path_list):
                if path.is_tied:
                    losses.append(1000)
                else:
                    # Compute the loss if we take out the k-th path
                    shapes = self.shapes[:p] + self.shapes[p + 1 :]
                    shape_groups = add_shape_groups(
                        self.shape_groups[:p], self.shape_groups[p + 1 :]
                    )
                    img = self.build_img(shapes, shape_groups, 5)
                    img_augs = []
                    for n in range(self.num_augs):
                        img_augs.append(self.augment_trans(img))
                    im_batch = torch.cat(img_augs)
                    img_features = self.model.encode_image(im_batch)
                    loss = 0
                    for n in range(self.num_augs):
                        loss -= torch.cosine_similarity(
                            self.text_features, img_features[n : n + 1], dim=1
                        )
                    losses.append(loss.cpu().item())

            # Compute scores
            scores = [-0.01 * dists[k] ** (0.5) + losses[k] for k in range(len(losses))]

            # Actual pruning
            inds = k_max_elements(scores, int((1 - prune_ratio) * self.num_paths))

            # Define the lists like this because using "for p in inds"
            # may (and often will) change the order of the traces
            self.shapes = [
                self.shapes[p] for p in range(len(self.path_list)) if p in inds
            ]
            self.shape_groups = add_shape_groups(
                [self.shape_groups[p] for p in range(len(self.path_list)) if p in inds],
                [],
            )
            self.path_list = [
                self.path_list[p] for p in range(len(self.path_list)) if p in inds
            ]

        self.initialize_variables()
        self.prune_ratio += self.p0 / len(self.prune_places)
        logging.info("Prune complete")

    def run_epoch(self):
        t = self.iteration
        logging.info(f"Starting run {t} in drawer {str(self.sketch_reference_index)}")

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

        for k in range(len(self.points_vars0)):
            if self.path_list[k].is_tied:
                points_loss += torch.norm(self.points_vars[k] - self.points_vars0[k])
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
            # 'image': img_loss,
            # 'geometric': geo_loss,
        }

        logging.info(f"Completed run {t} in drawer {str(self.sketch_reference_index)}")
        self.iteration += 1

    async def render_and_save(self, t, loss, pruning=False):
        status = str(self.sketch_reference_index)
        if pruning:
            status="pruning"
        if self.sketch_reference_index is not None:
            self.resizeScaleFactor = 224 / self.frame_size

        # render_shapes, render_shape_groups = rescale_constants(self.shapes, self.shape_groups, self.resizeScaleFactor)

        pydiffvg.save_svg(
            f"results/output-{str(self.sketch_reference_index)}.svg",
            self.user_canvas_w,
            self.user_canvas_h,
            self.shapes,
            self.shape_groups,
        )

        svg = ""
        with open(f"results/output-{str(self.sketch_reference_index)}.svg", "r") as f:
            svg = f.read()

        result = {
            "status": status,
            "svg": svg,
            "iterations": t,
            "loss": str(loss.item()),
            "sketch_index": self.sketch_reference_index,
        }
        try:
            logging.info("Sending...")
            await self.socket.send_json(result)
            logging.info(f"Finished update for {self.sketch_reference_index}")
            self.last_result = result  # only for continue
        except Exception as e:
            logging.error("Failed sending WS response")
            pass

    def setup_draw(self, data):
        """Use current paths with the given (possibly different) prompt to generate options"""
        logging.info("Updating...")
        prompt = data["data"]["prompt"]
        svg_string = data["data"]["svg"]
        region = data["data"]["region"]
        self.w_points, self.w_colors, self.w_widths = use_penalisation(
            data["data"]["fixation"]
        )
        self.clip_interface.positive = prompt
        if svg_string is not None:
            with open('data/interface_paths.svg', 'w') as f:
                f.write(svg_string)
        prompt_features = self.clip_interface.encode_text_classes(prompt)
        try:
            self.reset()
            logging.info("Starting clip drawer")
            prompt_features = self.clip_interface.encode_text_classes([prompt])
            neg_prompt_features = self.clip_interface.encode_text_classes([])
            self.set_text_features(prompt_features, neg_prompt_features)
        except Exception as e:
            logging.error(e)
            logging.error("Failed to encode features in clip")

        self.last_region = region
        self.num_paths = data["data"]["random_curves"]
        self.parse_svg(region)
        logging.info("Got features")
        return self.activate()

    def redraw(self):
        """Use original paths with origional prompt to try new options from same settings"""
        logging.info("Starting redraw")
        self.parse_svg(self.last_region)
        self.iteration = 0
        return self.activate()

    def continue_update_sketch(self, data, restart=False):
        """Keep the last drawer running"""
        logging.info("Adding sketch changes...")

        svg_string = data["data"]["svg"]

        if svg_string is not None:
            logging.info("Updating sketch")
            with open('data/interface_paths.svg', 'w') as f:
                f.write(svg_string)

        self.parse_svg(self.last_region)

        try:
            self.num_user_paths = int(data["data"]["num_user_paths"])
        except Exception as e:
            logging.error("Must include number of user paths")

        self.w_points, self.w_colors, self.w_widths = use_penalisation(
            data["data"]["fixation"]
        )

        if restart:
            return self.activate()
        else:
            return self.activate_without_curves()

    async def stop(self):
        # check the socket is still open before sending stop
        logging.info(f"Stopping... {self.sketch_reference_index}")
        self.is_running = False
        # await self.socket.send_json({"status": "stop"})

    async def loop(self):
        while self.is_running and self.iteration < self.num_iter:
            try:
                self.run_epoch()
                # if self.iteration % self.refresh_rate == 0:
                await self.render_and_save(self.iteration, self.losses['global'])
            except Exception as e:
                logging.info("Iteration failed on: ", self.sketch_reference_index)
                await self.stop()

    def run_async(self):
        self.is_running = True  # for loop to continue
        loop = asyncio.get_running_loop()
        loop.run_in_executor(None, lambda: asyncio.run(self.loop()))
