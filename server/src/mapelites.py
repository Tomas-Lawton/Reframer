import os
import pickle
import torch
import random
import shortuuid
import pandas as pd
from mapelites_config import args
from behaviour import TextBehaviour
from map_utils import run_cicada, Grid

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

# Generate population
for k in range(args.population_size):
    print(f"Building {k+1}-th initial individual...")
    fitness, behs, drawing = run_cicada(args, text_behaviour, num_iter=args.num_iter)
    df.loc[drawing.id] = [False, 0, fitness] + behs
    with open(f"{save_path}/{drawing.id}.pkl", "wb") as f:
        pickle.dump(drawing, f)
    df.to_csv(f"{save_path}/df.csv", index_label="id")

# Build grid
grid = Grid()
for beh in text_behaviour.behaviours:
    grid.add_scale(beh['name'], list(df[beh['name']]), args.grid_size)

# Fill grid
for id in df.index:
    x = df.loc[id]
    behs = [x[dim_name] for dim_name in grid.dims]
    in_population, replaced_id = grid.allocate(id, behs, x['fitness'])
    df.at[id, "in_population"] = in_population
    if replaced_id is not None:
        df.at[replaced_id, "in_population"] = False

df.to_csv(f"{save_path}/df.csv", index_label="id")

grid.image_array_2d(save_path, "initial_population")
# mu, S = fid.get_statistics(
#     f"{save_path}/initial_population",
#     rand_sampled_set_dim=10,
# )
print("initial Population")
print(df)
print(grid.id_mat)
print(grid.fit_mat)
# print('Entropy: ', tie(S))
print("")

# Search
for iter in range(args.mapelites_iters):
    print(f"Building {iter+1}-th mutant...")
    mutant_id = random.choice(df.loc[df["in_population"]].index)
    with open(f"{save_path}/{mutant_id}.pkl", "rb") as f:
        drawing = pickle.load(f)
    drawing.id = shortuuid.uuid()
    fitness, behs, drawing = run_cicada(
        args, text_behaviour, drawing=drawing, mutate=True, num_iter=args.num_iter // 2
    )
    in_population, replaced_id = grid.allocate(drawing.id, behs, fitness)
    df.loc[drawing.id] = [in_population, iter + 1, fitness] + behs
    if replaced_id is not None:
        df.at[replaced_id, "in_population"] = False

    # save
    with open(f"{save_path}/{drawing.id}.pkl", "wb") as f:
        pickle.dump(drawing, f)
    with open(f"{save_path}/grids.pkl", "wb") as f:
        pickle.dump(grid, f)
    df.to_csv(f"{save_path}/df.csv", index_label="id")

grid.image_array_2d(save_path, "final_population")
# mu, S = fid.get_statistics(
#     f"{save_path}/final_population",
#     rand_sampled_set_dim=10,
# )
print("Final Population")
print(df)
print(grid.id_mat)
print(grid.fit_mat)
# print('Entropy: ', tie(S))
print("")
