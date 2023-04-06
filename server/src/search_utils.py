import pickle
import os
import torch
from server.src.cicada import Cicada


class PathManager:
    '''all this mess because Python won't read files using symlinks'''

    def __init__(self, this_path, alt_path):
        self.alt_path = alt_path
        if this_path == "results/tmp":
            self.this_path = "results/tmp"
        else:
            k = 0
            while os.path.exists(f"{this_path}_{k}"):
                k += 1
            self.this_path = f"{this_path}_{k}"
            os.makedirs(self.this_path)
            os.makedirs(f"{self.this_path}/images")

    def load_file(self, id, ext):
        if os.path.exists(f"{self.this_path}/{id}.{ext}"):
            path = self.this_path
        else:
            path = self.alt_path

        with open(f"{path}/{id}.{ext}", "rb") as f:
            x = pickle.load(f)

        return x


def run_cicada(
    args,
    text_behaviour,
    target_behaviours=None,
    drawing=None,
    mutate=False,
    num_iter=1000,
    omg_mega=False,
    c=[0.3, 0.3],
    lr_weight=1,
    prune=False,
    beh_weight=0.3,
):
    cicada = Cicada(
        device="cuda:0" if torch.cuda.is_available() else "cpu",
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
    cicada.add_prompt(args.prompt)
    if target_behaviours is not None:
        for b, beh in enumerate(text_behaviour.behaviours):
            cicada.add_behaviour(beh["name"], target_behaviours[b], beh_weight)

    if drawing is None:
        cicada.load_svg_shapes(args.svg_path)
        cicada.add_random_shapes(args.num_paths)

    cicada.initialize_variables()
    cicada.initialize_optimizer(weight=lr_weight)
    if mutate:
        cicada.mutate_respawn_traces()
    losses = []
    behs = []
    for t in range(num_iter):
        if not omg_mega:
            cicada.run_epoch()
            if prune and t == round(num_iter * 0.7):
                cicada.prune()
            if t == num_iter - 1:
                with torch.no_grad():
                    losses.append(cicada.losses["semantic"].detach())
                    behs.append(text_behaviour.eval_behaviours(cicada.img))
        else:
            cicada.run_omg_mega_epoch()
            if t == num_iter - 1:
                with torch.no_grad():
                    losses.append(cicada.losses["semantic"].detach())
                    behs.append(text_behaviour.eval_behaviours(cicada.img))

    loss = torch.mean(torch.cat(losses)).item()
    behs = torch.mean(torch.cat([b.unsqueeze(0) for b in behs]), dim=0)
    fitness = 1 - loss
    behs = [b.item() for b in behs]
    cicada.drawing.render_img()
    return fitness, behs, cicada.drawing


def random_target(id, df, sigma=0.02, weight=2):
    xx = torch.tensor(df[df.columns.values[-2]])
    yy = torch.tensor(df[df.columns.values[-1]])
    x0 = torch.mean(xx)
    y0 = torch.mean(yy)
    x1 = df[df.columns.values[-2]].loc[id]
    y1 = df[df.columns.values[-1]].loc[id]
    theta = torch.atan((y1 - y0) / (x1 - x0))
    sign_y = 1 if y1 > y0 else -1
    sign_x = 1 if x1 > x0 else -1
    theta += torch.randn(size=()) * sigma
    dir = torch.tensor([sign_x, sign_y * abs(torch.tan(theta))])
    dir = dir / torch.norm(dir)
    proj = xx * dir[0] + yy * dir[1]
    sd = torch.std(proj, 0)
    # move 2 standard deviations
    target_vec = torch.tensor([x1, y1]) + dir * sd * weight
    # print("mean: ", torch.tensor([x0,y0]))
    # print("point: ", torch.tensor([x1, y1]))
    # print("target: ", target_vec)
    return target_vec, x0, y0
