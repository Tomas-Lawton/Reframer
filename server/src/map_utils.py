import numpy as np
import torch
import pydiffvg
import pickle
from src.drawing_model import Cicada


device = "cuda:0" if torch.cuda.is_available() else "cpu"


def run_cicada(args, text_behaviour, drawing=None, mutate=False, num_iter=1000):
    cicada = Cicada(
        device=device,
        drawing_area=args.drawing_area,
        max_width=args.max_width,
        drawing=drawing,
    )
    cicada.set_penalizers(
        w_points=args.w_points,
        w_colors=args.w_colors,
        w_widths=args.w_widths,
        w_geo=args.w_geo,
    )
    cicada.process_text(args.prompt)
    if not mutate:
        cicada.load_svg_shapes(args.svg_path)
        cicada.add_random_shapes(args.num_paths)
    cicada.initialize_variables()
    cicada.initialize_optimizer()
    if mutate:
        cicada.mutate_respawn_traces()
    losses = []
    behs = []
    for t in range(num_iter):
        cicada.run_epoch()
        if t > num_iter - 11:
            with torch.no_grad():
                losses.append(cicada.losses["global"].detach())
                behs.append(text_behaviour.eval_behaviours(cicada.img))

    cicada.drawing.render_img()
    loss = torch.mean(torch.cat(losses)).item()
    behs = torch.mean(torch.cat([b.unsqueeze(0) for b in behs]), dim=0)
    fitness = 1 - loss
    behs = [b.item() for b in behs]
    return fitness, behs, cicada.drawing


class Grid:
    def __init__(self):
        self.id_mat = None
        self.fit_mat = -10.0
        self.dims = {}

    def add_scale(self, dim_name, value_list, num_slots):
        mx = min(value_list)
        Mx = max(value_list)
        grid_min = mx - 0.1 * (Mx - mx)
        grid_max = Mx + 0.1 * (Mx - mx)
        values = [
            grid_min + k * (grid_max - grid_min) / (num_slots - 2)
            for k in range(num_slots - 1)
        ]
        self.dims[dim_name] = values
        self.id_mat = np.array([self.id_mat for k in range(num_slots)])
        self.fit_mat = np.array([self.fit_mat for k in range(num_slots)])

    def get_grid_idx(self, beh, dim_name):
        grid_idx = 0
        for value in self.dims[dim_name]:
            if beh < value:
                break
            else:
                grid_idx += 1

        return grid_idx

    def allocate(self, id, behs, fitness):
        grid_idx = []
        for d, dim_name in enumerate(self.dims):
            grid_idx.append(self.get_grid_idx(behs[d], dim_name))

        grid_idx = tuple(grid_idx)
        if fitness > self.fit_mat[grid_idx]:
            self.fit_mat[grid_idx] = fitness
            replaced_id = self.id_mat[grid_idx]
            self.id_mat[grid_idx] = id
            return True, replaced_id

        return False, None

    def image_array_2d(self, save_path, name):
        assert len(self.id_mat.shape) == 2
        for i in range(self.id_mat.shape[0]):
            for j in range(self.id_mat.shape[1]):
                if self.id_mat[i, j] is None:
                    img = torch.ones((224, 224, 3), device="cpu", requires_grad=False)
                else:
                    with open(f"{save_path}/{self.id_mat[i,j]}.pkl", "rb") as f:
                        drawing = pickle.load(f)
                    drawing.render_img()
                    img = drawing.img.cpu().permute(0, 2, 3, 1).squeeze(0)
                pydiffvg.imwrite(
                    img, f"{save_path}/{name}/{i}{j}.png", gamma=1,
                )
