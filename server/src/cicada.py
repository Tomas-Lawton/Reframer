from src import utils
from src.loss import CLIPConvLoss2
from src.render_design import treebranch_initialization
from drawing import Drawing
from src.processing import get_augment_trans
from src.svg_extraction import get_drawing_paths
import clip
import torch
import pydiffvg
import copy
import numpy as np

pydiffvg.set_print_timing(False)
pydiffvg.set_use_gpu(torch.cuda.is_available())
pydiffvg.set_device(torch.device('cuda:0') if torch.cuda.is_available() else 'cpu')


class Cicada:
    def __init__(
        self,
        device,
        canvas_w=224,
        canvas_h=224,
        drawing_area={'x0': 0, 'x1': 1, 'y0': 0, 'y1': 1},
        normalize_clip=True,
        max_width=40,
        drawing=None,
    ):
        self.device = device
        self.model, preprocess = clip.load('ViT-B/32', self.device, jit=False)
        self.clipConvLoss = CLIPConvLoss2(self.device)
        if drawing is None:
            self.drawing = Drawing(canvas_w, canvas_h)
        else:
            self.drawing = drawing
        self.augment_trans = get_augment_trans(
            self.drawing.canvas_width, normalize_clip
        )
        self.drawing_area = drawing_area
        self.attention_regions = []
        self.max_width = max_width
        self.t = 0
        self.prompt_features = []
        self.add_prompt("Written words.", -0.3)
        self.add_prompt("Text.", -0.3)
        self.behaviours = []

    @torch.no_grad()
    def add_prompt(self, prompt, weight=1):
        tokens = clip.tokenize(prompt).to(self.device)
        latent = self.model.encode_text(tokens)
        latent.requires_grad = False
        self.prompt_features.append({"z": latent, "w": weight})

    @torch.no_grad()
    def add_latent(self, latent, weight=1):
        latent.requires_grad = False
        self.prompt_features.append({"z": latent.to(self.device), "w": weight})

    @torch.no_grad()
    def add_behaviour(self, prompt, target_beh, weight=0.3):
        z = self.model.encode_text(clip.tokenize(prompt).to(self.device))
        self.behaviours.append({"z": z, "b": target_beh, "w": weight})

    def load_svg_shapes(self, svg_path):
        '''
        This will discard all existing traces and load those in an svg file
        ---
        input:
            svg_path: String;
        '''
        path_list = get_drawing_paths(svg_path)
        self.drawing.add_paths(path_list)

    def load_listed_shapes(self, shapes, shape_groups, fix=True):
        '''
        This will NOT discard existing shapes
        ---
        input:
            shapes: Path[];
            shape_groups: PathGroup[];
            fix: Bool;
        '''
        self.drawing.add_shapes(shapes, shape_groups, fix)

    def add_traces(self, trace_list, replace=False, fix_all=False):
        '''
        Add traces on
        ---
        input:
            trace_list: Trace[];
            replace: Bool;
            fix_all: Bool;
        '''
        if fix_all:
            for trace in trace_list:
                trace.is_fixed = True
        if replace:
            self.drawing.replace_traces(trace_list)
        else:
            self.drawing.add_traces(trace_list)
        self.initialize_variables()

    def repalce_traces(self, trace_list, fix_all=False):
        '''
        Replace traces in the same positions
        ---
        input:
            trace_list: Trace[];
            fix_all: Bool;
        '''
        if fix_all:
            for trace in trace_list:
                trace.is_fixed = True
        self.drawing.replace_traces(trace_list)
        self.initialize_variables()

    def add_random_shapes(self, num_rnd_traces):
        '''
        This will NOT discard existing shapes
        ---
        input:
            num_rnd_traces: Int;
        '''
        shapes, shape_groups = treebranch_initialization(
            self.drawing, num_rnd_traces, self.drawing_area,
        )
        self.drawing.add_shapes(shapes, shape_groups, fixed=False)

    def remove_traces(self, idx_list):
        '''
        Remove the traces indexed in idx_list
        ---
        input:
            num_rnd_traces: Int[];
        '''
        self.drawing.remove_traces(idx_list)
        self.initialize_variables()

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
        self.mask = utils.area_mask(
            self.drawing.canvas_width, self.drawing.canvas_height, self.drawing_area
        ).to(self.device)
        self.points_vars0 = copy.deepcopy(self.points_vars)
        self.stroke_width_vars0 = copy.deepcopy(self.stroke_width_vars)
        self.color_vars0 = copy.deepcopy(self.color_vars)
        for k in range(len(self.color_vars0)):
            self.points_vars0[k].requires_grad = False
            self.stroke_width_vars0[k].requires_grad = False
            self.color_vars0[k].requires_grad = False
        self.img0 = copy.copy(self.drawing.img.detach())

    def initialize_optimizer(self, weight=1):
        self.points_optim = torch.optim.Adam(self.points_vars, lr=weight * 0.3)
        self.width_optim = torch.optim.Adam(self.stroke_width_vars, lr=weight * 0.3)
        self.color_optim = torch.optim.Adam(self.color_vars, lr=weight * 0.03)

    def build_img(self, t, shapes=None, shape_groups=None):
        if not shapes:
            shapes = [trace.shape for trace in self.drawing.traces]
            shape_groups = [trace.shape_group for trace in self.drawing.traces]
        scene_args = pydiffvg.RenderFunction.serialize_scene(
            self.drawing.canvas_width, self.drawing.canvas_height, shapes, shape_groups
        )
        img = self.render(
            self.drawing.canvas_width,
            self.drawing.canvas_height,
            2,
            2,
            self.t,
            None,
            *scene_args,
        )
        self.t += 1
        img = img[:, :, 3:4] * img[:, :, :3] + torch.ones(
            img.shape[0], img.shape[1], 3, device=pydiffvg.get_device()
        ) * (1 - img[:, :, 3:4])
        img = img[:, :, :3].unsqueeze(0).permute(0, 3, 1, 2)  # NHWC -> NCHW
        return img

    def set_penalizers(
        self,
        w_points=0.001,
        w_colors=0.01,
        w_widths=0.001,
        w_img=0.0,
        w_geo=3.5,
        w_global=1,
    ):
        self.w_points = w_points
        self.w_colors = w_colors
        self.w_widths = w_widths
        self.w_img = w_img
        self.w_geo = w_geo
        self.w_global = w_global

    def mutate_lr(self, increase_rate=5, num_iter=10):
        self.initialize_optimizer(increase_rate)
        for iter in range(num_iter):
            self.run_epoch()
        self.initialize_optimizer(1)

    @torch.no_grad()
    def mutate_respawn_traces(self, rate=0.3, num_sets=10, num_augs=4):
        unfixed_inds = [
            k
            for k in range(len(self.drawing.traces))
            if not self.drawing.traces[k].is_fixed
        ]
        N = round(rate * len(unfixed_inds))
        index_lists = [np.random.choice(unfixed_inds, N) for k in range(num_sets)]
        losses = []
        for idx_list in index_lists:
            shapes, shape_groups = self.drawing.all_shapes_except(idx_list)
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

        min_idx = np.argmin(losses)
        self.drawing.remove_traces(index_lists[min_idx])
        self.add_random_shapes(N)

    @torch.no_grad()
    def mutate_area_kill(self, grid_divs=5, num_augs=4):
        losses = []
        areas = []
        for kx in range(grid_divs - 1):
            for ky in range(grid_divs - 1):
                area = {
                    'x0': kx / grid_divs,
                    'x1': (kx + 2) / grid_divs,
                    'y0': ky / grid_divs,
                    'y1': (ky + 2) / grid_divs,
                }
                mask = utils.area_mask(
                    self.drawing.canvas_width, self.drawing.canvas_height, area
                ).to(self.device)
                loss = 0
                img_augs = []
                img = self.build_img(100000)
                for n in range(num_augs):
                    img_augs.append(self.augment_trans(img * mask))

                im_batch = torch.cat(img_augs)
                img_features = self.model.encode_image(im_batch)
                for n in range(num_augs):
                    loss -= torch.cosine_similarity(
                        self.text_features, img_features[n : n + 1], dim=1
                    )
                losses.append(loss.to('cpu').item())
                areas.append(area)
        dead_area = areas[np.argmin(losses)]
        dead_area = {
            "x0": dead_area["x0"] * self.drawing.canvas_width,
            "x1": dead_area["x1"] * self.drawing.canvas_width,
            "y0": dead_area["y0"] * self.drawing.canvas_height,
            "y1": dead_area["y1"] * self.drawing.canvas_height,
        }
        removal_inds = []
        for t, trace in enumerate(self.drawing.traces):
            if not trace.is_fixed:
                for point in trace.shape.points:
                    if dead_area["x0"] < point[0] < dead_area["x1"]:
                        if dead_area["y0"] < point[1] < dead_area["y1"]:
                            removal_inds.append(t)
                            break

        self.drawing.remove_traces(removal_inds)
        self.add_random_shapes(len(removal_inds))

    # GRADIENT DESCENT
    def run_epoch(self, t="deprecated", num_augs=4):
        self.points_optim.zero_grad()
        self.width_optim.zero_grad()
        self.color_optim.zero_grad()

        img = self.build_img(t)
        self.img = img.cpu().permute(0, 2, 3, 1).squeeze(0)
        # self.drawing.img = self.img

        loss = 0
        sem_loss = 0

        img_augs = []
        for n in range(num_augs):
            img_augs.append(self.augment_trans(img))

        im_batch = torch.cat(img_augs)
        img_features = self.model.encode_image(im_batch)
        for n in range(num_augs):
            for prompt_feat in self.prompt_features:
                sem_loss -= prompt_feat["w"] * torch.cosine_similarity(
                    prompt_feat["z"], img_features[n : n + 1], dim=1
                )
            for behaviour in self.behaviours:
                loss += behaviour["w"] * torch.abs(
                    behaviour["b"]
                    - torch.cosine_similarity(
                        behaviour["z"], img_features[n : n + 1], dim=1
                    )
                )

        loss += sem_loss

        for att_region in self.attention_regions:
            cropped_batch = []
            cropped_img = img * att_region['mask'] + 1 - att_region['mask']
            for n in range(num_augs):
                cropped_batch.append(self.augment_trans(cropped_img))

            cropped_batch = torch.cat(cropped_batch)
            cropped_features = self.model.encode_image(cropped_batch)
            for n in range(num_augs):
                loss -= torch.cosine_similarity(
                    att_region['text_features'], cropped_features[n : n + 1], dim=1
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

        geo_loss = self.clipConvLoss(img * self.mask + 1 - self.mask, self.img0)

        for l_name in geo_loss:
            loss += self.w_geo * geo_loss[l_name]

        # Backpropagate the gradients.
        loss = self.w_global * loss
        loss.backward()

        # Take a gradient descent step.
        self.points_optim.step()
        self.width_optim.step()
        self.color_optim.step()
        for trace in self.drawing.traces:
            trace.shape.stroke_width.data.clamp_(1.0, self.max_width)
            trace.shape_group.stroke_color.data.clamp_(0.0, 1.0)

        self.losses = {
            'global': loss,
            'semantic': sem_loss,
            'points': points_loss,
            'widhts': widths_loss,
            'colors': colors_loss,
            'geometric': geo_loss,
        }

    def prune(self, prune_ratio=0.4, num_augs=4):
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
                        for prompt_feat in self.prompt_features:
                            loss -= prompt_feat["w"] * torch.cosine_similarity(
                                prompt_feat["z"], img_features[n : n + 1], dim=1
                            )
                    losses.append(loss.cpu().item())

            # Compute scores
            scores = [-0.01 * dists[k] ** (0.5) + losses[k] for k in range(len(losses))]

            # Actual pruning
            inds = utils.k_min_elements(
                scores, int(prune_ratio * len(self.drawing.traces))
            )
            self.drawing.remove_traces(inds)

        self.initialize_variables()

    def run_omg_mega_epoch(self, t="deprecated", num_augs=4):
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
            for prompt_feat in self.prompt_features:
                loss -= prompt_feat["w"] * torch.cosine_similarity(
                    prompt_feat["z"], img_features[n : n + 1], dim=1
                )
            for behaviour in self.behaviours:
                loss += behaviour["w"] * (
                    -torch.cosine_similarity(
                        behaviour["z0"], img_features[n : n + 1], dim=1
                    )
                    - torch.cosine_similarity(
                        behaviour["z1"], img_features[n : n + 1], dim=1
                    )
                )

        for att_region in self.attention_regions:
            cropped_batch = []
            cropped_img = img * att_region['mask'] + 1 - att_region['mask']
            for n in range(num_augs):
                cropped_batch.append(self.augment_trans(cropped_img))

            cropped_batch = torch.cat(cropped_batch)
            cropped_features = self.model.encode_image(cropped_batch)
            for n in range(num_augs):
                loss -= torch.cosine_similarity(
                    att_region['text_features'], cropped_features[n : n + 1], dim=1
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

        geo_loss = self.clipConvLoss(img * self.mask + 1 - self.mask, self.img0)

        for l_name in geo_loss:
            loss += self.w_geo * geo_loss[l_name]

        # Backpropagate the gradients.
        loss = self.w_global * loss
        loss.backward()

        # Take a gradient descent step.
        self.points_optim.step()
        self.width_optim.step()
        self.color_optim.step()
        for trace in self.drawing.traces:
            trace.shape.stroke_width.data.clamp_(1.0, self.max_width)
            trace.shape_group.stroke_color.data.clamp_(0.0, 1.0)

        self.losses = {
            'global': loss,
            'points': points_loss,
            'widhts': widths_loss,
            'colors': colors_loss,
            'image': img_loss,
            'geometric': geo_loss,
        }
