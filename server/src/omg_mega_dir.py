from behaviour import TextBehaviour
from mapelites_config import args
from search_utils import PathManager, run_cicada, random_target
import pandas as pd
import torch
import plotly.graph_objects as go
import pickle
import random
import pydiffvg
import shortuuid

args.save_path = "results/omg_mega/chair"
args.search_iter = 1
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
    target_vec, x0, y0 = random_target(mutant_id, df, sigma=0, weight=2)
    drawing = path_man.load_file(mutant_id, "pkl")
    drawing.id = shortuuid.uuid()
    fitness, behs, drawing = run_cicada(
        args,
        text_behaviour,
        behaviour_wordss=behaviour_dims,
        drawing=drawing,
        mutate=False,
        num_iter=100,
        omg_mega=False,
        target=target_vec,
        lr_weight=2,
    )
    fitness, behs, drawing = run_cicada(
        args,
        text_behaviour,
        behaviour_wordss=behaviour_dims,
        drawing=drawing,
        mutate=False,
        num_iter=100,
        omg_mega=False,
        target=target_vec,
        lr_weight=1.5,
    )
    fitness, behs, drawing = run_cicada(
        args,
        text_behaviour,
        behaviour_wordss=behaviour_dims,
        drawing=drawing,
        mutate=False,
        num_iter=100,
        omg_mega=False,
        target=target_vec,
        lr_weight=1,
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
fig.add_trace(go.Scatter(x=[x0], y=[y0], mode='markers', name="centroid",))
filtered_df = df.loc[mutant_id]
print(filtered_df)
fig.add_trace(
    go.Scatter(
        x=[filtered_df[text_behaviour.behaviours[0]["name"]]],
        y=[filtered_df[text_behaviour.behaviours[1]["name"]]],
        mode='markers',
        name="Neo",
        marker={'symbol': 'circle-cross'},
    )
)
print(target_vec)
fig.update_layout(
    title=path_man.this_path,
    annotations=[
        go.layout.Annotation(
            dict(
                x=target_vec[0],
                y=target_vec[1],
                xref="x",
                yref="y",
                text="",
                showarrow=True,
                axref="x",
                ayref='y',
                ax=filtered_df[text_behaviour.behaviours[0]["name"]],
                ay=filtered_df[text_behaviour.behaviours[1]["name"]],
                arrowhead=3,
                arrowwidth=1.5,
                arrowcolor='rgb(255,51,0)',
            )
        )
    ],
)
K = 11
for k in range(K):
    fig.add_vline(-0.15 + 0.03 * k, line_width=1, line_color="gray")
    fig.add_hline(-0.15 + 0.03 * k, line_width=1, line_color="gray")
fig.show()

print(f"\n Done! Results saved to {path_man.this_path}")
