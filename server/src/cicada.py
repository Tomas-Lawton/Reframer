import copy
import torch
import pydiffvg
from util.processing import get_augment_trans
from util.loss import CLIPConvLoss2
from util.utils import area_mask, use_penalisation, k_min_elements
from util.clip_utility import  data_to_tensor

import clip
import logging
import asyncio
from sketch import Sketch
from constants import *

class CICADA:
    def __init__(self, websocket, device, model, index=None):
        """These inputs are defaults and can have methods for setting them after the inital start up"""
        self.index = index
        self.ws = websocket
        self.device = device
        self.model = model
        # self.clipConvLoss = CLIPConvLoss2(self.device)
        self.augment_trans = get_augment_trans(canvas_w, normalize_clip)
        
        # Variables
        self.iteration = 0
        self.w_points = 0.01
        self.w_colors = 0.1
        self.w_widths = 0.01
        self.w_img = 0.01
        self.w_full_img = 0.001
        prune_places = [round(num_iter * (k + 1) * 0.8 / 1) for k in range(1)]
        self.prune_ratio = p0 / len(prune_places)

    def encode_text_classes(self, token_list):
        if token_list == []:
            return token_list
        tokens = clip.tokenize(token_list).to(self.device)
        with torch.no_grad():
            features = self.model.encode_text(tokens)  # normalise
            return features / features.norm(dim=-1, keepdim=True)

    def extract_points(self):
        path_list = []
        for path in self.sketch_data: 
            points = []
            num_segments = len(path['path_data'].split(',')) // 3
            spaced_data = path['path_data'].split('c')
            x0 = spaced_data[0][1:].split(',')  # only thing different is M instead of m
            curve_list = [
                spaced_data.split(' ') for spaced_data in spaced_data[1:]
            ]  # exclude move to
            point_list = []
            for curve in curve_list:
                for i in range(3):
                    point_list.append(curve[i])
            tuple_array = [
                tuple.split(',') for tuple in point_list
            ]  # split each curve by spaces, then comma for points
            points_array = [
                [
                    round(float(x) * self.normaliseScaleFactor, 5),
                    round(float(y) * self.normaliseScaleFactor, 5),
                ]
                for [x, y] in tuple_array
            ]
            start_x = round(float(x0[0]) / self.user_canvas_w, 5)
            start_y = round(float(x0[1]) / self.user_canvas_h, 5)
            x0 = [start_x, start_y]
            points = [x0] + points_array

            if len(points) > 0:
                path_list.append(data_to_tensor(path["color"], float(path['stroke_width'] * self.normaliseScaleFactor), 
                    points, num_segments, path["tie"])) #add tiepath["tie"]
        return path_list

    def activate(self, add_curves):
        self.is_active = True
        paths = self.extract_points()
        # Move this ?
        self.drawing = Sketch(canvas_w, canvas_h)
        self.drawing.add_paths(paths)
        if add_curves:
            self.drawing.add_random_shapes(self.num_paths)
        self.drawing.update_region(self.region)
        self.initialize_variables()
        self.initialize_optimizer()            

    def initialize_variables(self):
        self.points_vars = []
        self.stroke_width_vars = []
        self.color_vars = []
        for trace in self.drawing.traces:
            trace.shape.points.requires_grad = True
            self.points_vars.append(trace.shape.points)
            trace.shape.stroke_width.requires_grad = True
            self.stroke_width_vars.append(trace.shape.stroke_width)
            trace.shape_group.stroke_color.requires_grad = True
            self.color_vars.append(trace.shape_group.stroke_color)

        self.render = pydiffvg.RenderFunction.apply
        self.mask = area_mask(canvas_w, canvas_h, self.drawing.drawing_area).to(
            self.device
        )
        self.points_vars0 = copy.deepcopy(self.points_vars)
        self.stroke_width_vars0 = copy.deepcopy(self.stroke_width_vars)
        self.color_vars0 = copy.deepcopy(self.color_vars)
        for k in range(len(self.color_vars0)):
            self.points_vars0[k].requires_grad = False
            self.stroke_width_vars0[k].requires_grad = False
            self.color_vars0[k].requires_grad = False
        self.img0 = copy.copy(self.drawing.img.detach())
        logging.info("Initialised vars")

    def initialize_optimizer(self):
        self.points_optim = torch.optim.Adam(self.points_vars, lr=0.2)
        self.width_optim = torch.optim.Adam(self.stroke_width_vars, lr=0.2)
        self.color_optim = torch.optim.Adam(self.color_vars, lr=0.02)
        logging.info("Initialised Optimisers")

    def build_img(self, t, shapes=None, shape_groups=None):
        if not shapes:
            shapes = [trace.shape for trace in self.drawing.traces]
            shape_groups = [trace.shape_group for trace in self.drawing.traces]
        scene_args = pydiffvg.RenderFunction.serialize_scene(
            canvas_w, canvas_h, shapes, shape_groups
        )
        img = self.render(canvas_w, canvas_h, 2, 2, t, None, *scene_args)
        img = img[:, :, 3:4] * img[:, :, :3] + torch.ones(
            img.shape[0], img.shape[1], 3, device=pydiffvg.get_device()
        ) * (1 - img[:, :, 3:4])
        img = img[:, :, :3].unsqueeze(0).permute(0, 3, 1, 2)  # NHWC -> NCHW
        return img


    def run_epoch(self, t):
        self.points_optim.zero_grad()
        self.width_optim.zero_grad()
        self.color_optim.zero_grad()

        img = self.build_img(t)

        img_loss = (
            torch.norm((img - self.img0) * self.mask)
            if self.w_img > 0
            else torch.tensor(0, device=self.device)
        )

        self.img = img.cpu().permute(0, 2, 3, 1).squeeze(0)

        loss = 0

        img_augs = []
        for n in range(num_augs):
            img_augs.append(self.augment_trans(img))
        im_batch = torch.cat(img_augs)
        img_features = self.model.encode_image(im_batch)
        for n in range(num_augs):
            loss -= torch.cosine_similarity(
                self.text_features, img_features[n : n + 1], dim=1
            )
            if use_neg_prompts:
                loss += (
                    -torch.cosine_similarity(
                        self.negative_text_features, img_features[n : n + 1], dim=1 #allow multiple
                    )
                    * 0.3
                )
        self.img_features = img_features

        points_loss = 0
        widths_loss = 0
        colors_loss = 0

        for k in range(len(self.points_vars)):
            if self.drawing.traces[k].is_fixed:
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
        #     loss += w_geo * geo_loss[l_name]
        # loss += args.w_geo * geo_loss['clip_conv_loss_layer3']

        # Backpropagate the gradients.
        loss.backward()

        # Take a gradient descent step.
        self.points_optim.step()
        self.width_optim.step()
        self.color_optim.step()
        for trace in self.drawing.traces:
            trace.shape.stroke_width.data.clamp_(1.0, max_width)
            trace.shape_group.stroke_color.data.clamp_(0.0, 1.0)

        self.losses = {
            'global': loss,
            # 'points': points_loss,
            # 'widhts': widths_loss,
            # 'colors': colors_loss,
            # 'image': img_loss,
            # 'geometric': geo_loss,
        }

    
    def prune(self):
        prune_ratio = self.prune_ratio
        with torch.no_grad():

            # Get points of tied traces
            fixed_points = []
            for trace in self.drawing.traces:
                if trace.is_fixed:
                    fixed_points += [
                        x.unsqueeze(0)
                        for i, x in enumerate(trace.shape.points)
                        if i % 3 == 0
                    ]  # only points the path goes through

            # Compute distances
            dists = []
            if fixed_points:
                fixed_points = torch.cat(fixed_points, 0)
                for trace in self.drawing.traces:
                    if trace.is_fixed:
                        dists.append(-1000)  # We don't remove fixed traces
                    else:
                        points = [
                            x.unsqueeze(0)
                            for i, x in enumerate(trace.shape.points)
                            if i % 3 == 0
                        ]  # only points the path goes through
                        min_dists = []
                        for point in points:
                            d = torch.norm(point - fixed_points, dim=1)
                            d = min(d)
                            min_dists.append(d.item())

                        dists.append(min(min_dists))

            # Compute losses
            losses = []
            for n, trace in enumerate(self.drawing.traces):
                if trace.is_fixed:
                    losses.append(1000)  # We don't remove fixed traces
                else:
                    # Compute the loss if we take out the k-th path
                    shapes, shape_groups = self.drawing.all_shapes_but_kth(n)
                    img = self.build_img(5, shapes, shape_groups)
                    img_augs = []
                    for n in range(num_augs):
                        img_augs.append(self.augment_trans(img))
                    im_batch = torch.cat(img_augs)
                    img_features = self.model.encode_image(im_batch)
                    loss = 0
                    for n in range(num_augs):
                        loss -= torch.cosine_similarity(
                            self.text_features, img_features[n : n + 1], dim=1
                        )
                    losses.append(loss.cpu().item())

            # Compute scores
            scores = [-0.01 * dists[k] ** (0.5) + losses[k] for k in range(len(losses))]

            # Actual pruning
            inds = k_min_elements(
                scores, int(prune_ratio * len(self.drawing.traces))
            )
            self.drawing.remove_traces(inds)

        self.initialize_variables()

    async def render_client(self, t, loss, pruning=False):
        status = str(self.index)
        if pruning:
            status="pruning"

        shapes = [trace.shape for trace in self.drawing.traces]
        shape_groups = [trace.shape_group for trace in self.drawing.traces]

        pydiffvg.save_svg(
            f"results/output-{str(self.index)}.svg",
            self.user_canvas_w,
            self.user_canvas_h,
            shapes,
            shape_groups,
        )

        svg = ""
        with open(f"results/output-{str(self.index)}.svg", "r") as f:
            svg = f.read()

        try:
            await self.socket.send_json({
            "status": status,
            "svg": svg,
            # "shapes": shapes,
            # "groups": shape_groups,
            "iterations": t,
            "loss": str(loss.item()),
            "sketch_index": self.index,
        })
            logging.info(f"Finished update for {self.index}")
        except Exception as e:
            logging.error("Failed sending WS response")
            pass

    def draw(self, data):
        logging.info("Updating...")
        self.iteration = 0
        self.frame_size = data["data"]["frame_size"]
        self.num_paths = data["data"]["random_curves"]
        self.sketch_data = data["data"]["sketch"]
        self.region = data["data"]["region"]
        self.w_points, self.w_colors, self.w_widths = use_penalisation(
            data["data"]["fixation"])
        self.num_user_paths = int(data["data"]["num_user_paths"])
        self.text_features = self.encode_text_classes([data["data"]["prompt"]])
        # self.negative_text_features = self.clip_interface.encode_text_classes(["Written words.", "Text."])
        self.negative_text_features = self.encode_text_classes(["text and written words."])

        self.user_canvas_w = self.frame_size
        self.user_canvas_h = self.frame_size
        self.normaliseScaleFactor = 1 / self.frame_size
        self.resizeScaleFactor = 224 / self.frame_size


    def continue_update_sketch(self, data):
        logging.info("Adding changes...")
        self.num_user_paths = int(data["data"]["num_user_paths"])
        self.w_points, self.w_colors, self.w_widths = use_penalisation(
            data["data"]["fixation"])
        self.sketch_data = data["data"]["sketch"]


    async def stop(self):
        logging.info(f"Stopping... {self.index}")
        self.is_running = False


    async def loop(self):
        while self.is_running and self.iteration < num_iter:
            try:
                self.run_epoch(self.iteration)
                self.iteration += 1
                # if self.device == "cpu":
                await self.render_client(self.iteration, self.losses['global'])
                # else: 
                #     if self.iteration % refresh_rate == 0:
                #         await self.render_client(self.iteration, self.losses['global'])
            except Exception as e:
                logging.info("Iteration failed on: ", self.index)
                await self.stop()

    def run_async(self):
        self.is_running = True  # for loop to continue
        loop = asyncio.get_running_loop()
        loop.run_in_executor(None, lambda: asyncio.run(self.loop()))
