from behaviour import TextBehaviour
from mapelites_config import args
from search_utils import PathManager, run_cicada
import pandas as pd
import torch
import plotly.graph_objects as go
import pickle
import random
import pydiffvg
import shortuuid

args.save_path = "results/omg_mega/chair"
args.search_iter = 10
args.sigma = 10
args.lr_weight = 1
args.init_pop_path = "results/omg_mega/chair_init_10"

device = "cuda:0" if torch.cuda.is_available() else "cpu"

# Initializing
path_man = PathManager(args.save_path, args.init_pop_path)
with open(f"{path_man.alt_path}/behaviour.pkl", "rb") as f:
    text_behaviour = pickle.load(f)
behaviour_dims = [x["name"] for x in text_behaviour.behaviours]
df = pd.read_csv(f"{path_man.alt_path}/df.csv", index_col="id")

# Arborescence or whatever
for i in range(args.search_iter):
    print(f"Creating {i+1}-th mutant...")
    mutant_id = random.choice(df.loc[df["in_population"]].index)
    drawing = path_man.load_file(mutant_id, "pkl")
    drawing.id = shortuuid.uuid()
    c = args.sigma * torch.randn(size=(2, 1), device=device)
    fitness, behs, drawing = run_cicada(
        args,
        text_behaviour,
        behaviour_wordss=behaviour_dims,
        drawing=drawing,
        mutate=False,
        num_iter=100,
        omg_mega=True,
        c=c,
    )
    df.loc[drawing.id] = [True, i + 1, fitness] + behs
    df.to_csv(f"{path_man.this_path}/df.csv", index_label="id")
    with open(f"{path_man.this_path}/{drawing.id}.pkl", "wb") as f:
        pickle.dump(drawing, f)

    img = drawing.img.cpu().permute(0, 2, 3, 1).squeeze(0)
    pydiffvg.imwrite(
        img, f"{path_man.this_path}/images/{drawing.id}.png", gamma=1,
    )

fig = go.Figure()
filtered_df = df.loc[df["orig_iter"] == 0]
fig.add_trace(
    go.Scatter(
        x=filtered_df[text_behaviour.behaviours[0]["name"]],
        y=filtered_df[text_behaviour.behaviours[1]["name"]],
        mode='markers',
        name="Initial Population",
    )
)
filtered_df = df.loc[df["orig_iter"] != 0]
fig.add_trace(
    go.Scatter(
        x=filtered_df[text_behaviour.behaviours[0]["name"]],
        y=filtered_df[text_behaviour.behaviours[1]["name"]],
        mode='markers',
        name="mutants",
    )
)
fig.update_layout(title=path_man.this_path)
fig.show()

print(f"\n Done! Results saved to {path_man.this_path}")
