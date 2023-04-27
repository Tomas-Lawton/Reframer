import os
import pickle
import torch
import random
import shortuuid
import pydiffvg
import pandas as pd
import src.fid_score as fid
from utils import tie
from mapelites_config import args
from drawing_model import Cicada
from behaviour import TextBehaviour

#
# Preliminaries
#
device = "cuda:0" if torch.cuda.is_available() else "cpu"

k = 0
while os.path.exists(f"{args.save_path}_{k}"):
    k += 1
save_path = f"{args.save_path}_{k}"
os.makedirs(save_path)
os.makedirs(save_path + "/initial_population")
os.makedirs(save_path + "/final_population")
delattr(args, "save_path")

text_behaviour = TextBehaviour()
behaviour_dims = [x.split("|") for x in args.behaviour_dims.split("||")]
for bd in behaviour_dims:
    text_behaviour.add_behaviour(bd[0], bd[1])
df = pd.DataFrame(
    columns=["in_population", "orig_iter", "fitness"]
    + [beh["name"] for beh in text_behaviour.behaviours]
)


#
# Aux
#
def run_cicada(args, drawing=None, mutate=False):
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
    for t in range(args.num_iter):
        cicada.run_epoch()
        if t > args.num_iter - 11:
            with torch.no_grad():
                losses.append(cicada.losses["global"].detach())
                behs.append(text_behaviour.eval_behaviours(cicada.img))

    loss = torch.mean(torch.cat(losses)).item()
    behs = torch.mean(torch.cat([b.unsqueeze(0) for b in behs]), dim=0)
    fitness = 1 - loss
    behs = [b.item() for b in behs]
    return fitness, behs, cicada.drawing


def id_check(id, grids):
    for grid_name in grids:
        for individual in grids[grid_name]["individuals"]:
            if individual["id"] == id:
                return True
    return False


def show_population(grids, name):
    print(name)
    for grid_name in grids:
        print(grid_name)
        for individual in grids[grid_name]["individuals"]:
            print(individual)
        print('')
    print('')


def plot_population(grids, name):
    for grid_name in grids:
        print(grid_name)
        for i, individual in enumerate(grids[grid_name]["individuals"]):
            if individual["id"] is None:
                img = torch.ones((224, 224, 3), device="cpu", requires_grad=False)
            else:
                with open(f"{save_path}/{individual['id']}.pkl", "rb") as f:
                    drawing = pickle.load(f)
                drawing.render_img()
                img = drawing.img.cpu().permute(0, 2, 3, 1).squeeze(0)

            pydiffvg.imwrite(
                img,
                f"{save_path}/{name}/{grid_name.replace(' ','_')}_{i}.png",
                gamma=1,
            )


def get_grid_idx(new_beh, grids):
    grid_idx = 0
    for value in grids[grid_name]["values"]:
        if new_beh < value:
            break
        else:
            grid_idx += 1

    return grid_idx


#
# MAPELITES
#
# Generate population
for k in range(args.population_size):
    fitness, behs, drawing = run_cicada(args)
    df.loc[drawing.id] = [False, 0, fitness] + behs
    with open(f"{save_path}/{drawing.id}.pkl", "wb") as f:
        pickle.dump(drawing, f)
    df.to_csv(f"{save_path}/df.csv", index_label="id")

# df = pd.read_csv("results/mapelites/chair_10/df.csv", index_col="id")
# save_path = "results/mapelites/chair_10"

# Build grids
grids = {}
for beh in text_behaviour.behaviours:
    x = list(df[beh['name']])
    mx = min(x)
    Mx = max(x)
    grid_min = mx - 0.1 * (Mx - mx)
    grid_max = Mx + 0.1 * (Mx - mx)
    grid = [
        grid_min + k * (grid_max - grid_min) / (args.grid_size - 2)
        for k in range(args.grid_size - 1)
    ]
    grids[beh['name']] = {
        "values": grid,
        "individuals": [{"id": None, "fitness": -1e5} for x in range(args.grid_size)],
    }

# Fill grids
for id in df.index:
    x = df.loc[id]
    for grid_name in grids:
        grid_idx = get_grid_idx(x[grid_name], grids)
        if grids[grid_name]["individuals"][grid_idx]["fitness"] < x["fitness"]:
            grids[grid_name]["individuals"][grid_idx]["id"] = id
            grids[grid_name]["individuals"][grid_idx]["fitness"] = x["fitness"]

for id in df.index:
    df.at[id, "in_population"] = id_check(id, grids)

show_population(grids, "Initial Population")
plot_population(grids, "initial_population")
mu, S = fid.get_statistics(f"{save_path}/initial_population", rand_sampled_set_dim=10,)
print('Entropy: ', tie(S))

# Search
for iter in range(args.mapelites_iters):
    mutant_id = random.choice(df.loc[df["in_population"]].index)
    with open(f"{save_path}/{mutant_id}.pkl", "rb") as f:
        drawing = pickle.load(f)
    drawing.id = shortuuid.uuid()
    fitness, behs, drawing = run_cicada(args, drawing=drawing, mutate=True)
    in_population = False
    for k, grid_name in enumerate(grids):
        grid_idx = get_grid_idx(behs[k], grids)
        # If the new individual is fitter than the one in its behaviour grid
        if grids[grid_name]["individuals"][grid_idx]["fitness"] < fitness:
            # Set to be added to population
            in_population = True
            # Remove previous individual, if not in other grid
            old_id = grids[grid_name]["individuals"][grid_idx]["id"]
            if old_id is not None:
                df.at[old_id, "in_population"] = id_check(old_id, grids)
            # Replace old individual with new
            grids[grid_name]["individuals"][grid_idx]["id"] = drawing.id
            grids[grid_name]["individuals"][grid_idx]["fitness"] = x["fitness"]

    df.loc[drawing.id] = [in_population, iter + 1, fitness] + behs

    # save
    with open(f"{save_path}/{drawing.id}.pkl", "wb") as f:
        pickle.dump(drawing, f)
    with open(f"{save_path}/grids.pkl", "wb") as f:
        pickle.dump(grids, f)
    df.to_csv(f"{save_path}/df.csv", index_label="id")

show_population(grids, "Final Population")
plot_population(grids, "final_population")
mu, S = fid.get_statistics(f"{save_path}/final_population", rand_sampled_set_dim=10,)
print('Entropy: ', tie(S))
