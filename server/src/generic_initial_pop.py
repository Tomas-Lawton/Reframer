from search_utils import run_cicada
from behaviour1D import TextBehaviour
from mapelites_config import args
import pandas as pd
import torch
import os
import pickle
import pydiffvg

args.save_path = "results/illuminate/chair_init"
args.init_pop_size = 3
# args.behaviour_dims = "abstract drawing||simple"
args.behaviour_dims = "large||colorful"

device = "cuda:0" if torch.cuda.is_available() else "cpu"

# TODO add recomputation of behaviours on population

k = 0
while os.path.exists(f"{args.save_path}_{k}"):
    k += 1
save_path = f"{args.save_path}_{k}"
os.makedirs(save_path)
os.makedirs(f"{save_path}/images")

text_behaviour = TextBehaviour()
for beh_word in args.behaviour_dims.split("||"):
    text_behaviour.add_behaviour(beh_word)

with open(f"{save_path}/behaviour.pkl", "wb") as f:
    pickle.dump(text_behaviour, f)

df = pd.DataFrame(
    columns=["in_population", "orig_iter", "fitness"]
    + [beh["name"] for beh in text_behaviour.behaviours]
)

# Initial population
for i in range(args.init_pop_size):
    print(f"Creating initial individual {i+1}...")
    fitness, behs, drawing = run_cicada(args, text_behaviour, prune=True)

    df.loc[drawing.id] = [True, 0, fitness] + behs
    df.to_csv(f"{save_path}/df.csv", index_label="id")
    with open(f"{save_path}/{drawing.id}.pkl", "wb") as f:
        pickle.dump(drawing, f)

    img = drawing.img.cpu().permute(0, 2, 3, 1).squeeze(0)
    pydiffvg.imwrite(
        img, f"{save_path}/images/{drawing.id}.png", gamma=1,
    )
