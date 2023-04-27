from cicada import Cicada
from behaviour import TextBehaviour
from mapelites_config import args
import pandas as pd
import torch
import plotly.graph_objects as go
import os
import pickle
import pydiffvg


prompts = [
    'A red chair.',
    'A drawing of a hat.',
    'A drawing of a lamp.',
    'A drawing of a pot.',
    'A drawing of a boat.',
    'A blue dress.',
    'A high-heel shoe.',
    'A bust.',
]
names = ['chair', 'hat', 'lamp', 'pot', 'boat', 'dress', 'shoe', 'bust']

drawing_areas = [
    {'x0': args.x0, 'x1': args.x1, 'y0': 0.5, 'y1': 1.0},
    {'x0': args.x0, 'x1': args.x1, 'y0': 0.5, 'y1': 1.0},
    {'x0': args.x0, 'x1': args.x1, 'y0': 0.5, 'y1': 1.0},
    {'x0': args.x0, 'x1': args.x1, 'y0': 0.0, 'y1': 0.5},
    {'x0': args.x0, 'x1': args.x1, 'y0': 0.4, 'y1': 1.0},
    {'x0': args.x0, 'x1': args.x1, 'y0': 0.0, 'y1': 0.5},
    {'x0': args.x0, 'x1': args.x1, 'y0': 0.0, 'y1': 0.5},
    {'x0': args.x0, 'x1': args.x1, 'y0': 0.5, 'y1': 1.0},
]


def run_cicada(
    args, behaviour_wordss, target, drawing=None, mutate=False, num_iter=1000
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
    for b, beh_words in enumerate(behaviour_wordss):
        cicada.add_behaviour(beh_words[0], beh_words[1], target[b])

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

    loss = torch.mean(torch.cat(losses)).item()
    behs = torch.mean(torch.cat([b.unsqueeze(0) for b in behs]), dim=0)
    fitness = 1 - loss
    behs = [b.item() for b in behs]
    return fitness, behs, cicada.drawing


for k in range(8):
    args.save_path = f"results/naive/{names[k]}"
    args.prompt = prompts[k]
    args.svg_path = f"data/drawing_{names[k]}.svg"
    args.drawing_area = drawing_areas[k]

    # args.save_path="results/naive/dress"
    # args.prompt = "A blue dress"
    # args.svg_path = "data/drawing_dress.svg"
    # args.drawing_area = {'x0': args.x0, 'x1': args.x1, 'y0': 0., 'y1': 0.5}

    # args.save_path="results/naive/chair"
    # args.prompt = "A blue dress"
    # args.svg_path = "data/drawing_dress.svg"
    # args.drawing_area = {'x0': args.x0, 'x1': args.x1, 'y0': 0., 'y1': 0.5}

    # args.save_path="results/naive/lamp"
    # args.prompt = "A lamp"
    # args.svg_path = "data/drawing_lamp.svg"
    # args.drawing_area = {'x0': args.x0, 'x1': args.x1, 'y0': 0., 'y1': 0.5}

    k = 0
    while os.path.exists(f"{args.save_path}_{k}"):
        k += 1
    save_path = f"{args.save_path}_{k}"
    os.makedirs(save_path)
    os.makedirs(f"{save_path}/images")

    text_behaviour = TextBehaviour()
    behaviour_dims = [x.split("|") for x in args.behaviour_dims.split("||")]
    for bd in behaviour_dims:
        text_behaviour.add_behaviour(bd[0], bd[1])
    df = pd.DataFrame(
        columns=["in_population", "orig_iter", "fitness"]
        + [beh["name"] for beh in text_behaviour.behaviours]
    )

    for i in range(5):
        b0 = -0.25 + (0.12 + 0.25) * i / 4
        for j in range(5):
            print(f"Running grid square ({i+1}, {j+1}) ...")
            b1 = -0.07 + (0.1 + 0.07) * j / 4
            fitness, behs, drawing = run_cicada(args, behaviour_dims, target=[b0, b1])
            df.loc[drawing.id] = [False, 0, fitness] + behs
            df.to_csv(f"{save_path}/df.csv", index_label="id")
            with open(f"{save_path}/{drawing.id}.pkl", "wb") as f:
                pickle.dump(drawing, f)

            img = drawing.img.cpu().permute(0, 2, 3, 1).squeeze(0)
            pydiffvg.imwrite(
                img, f"{save_path}/images/{drawing.id}.png", gamma=1,
            )

    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=df[text_behaviour.behaviours[0]["name"]],
            y=df[text_behaviour.behaviours[1]["name"]],
            mode='markers',
        )
    )
    fig.show()
