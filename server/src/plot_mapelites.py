import pandas as pd
import argparse
import pickle
import plotly.graph_objects as go
from map_utils import Grid
from tie import TIE

parser = argparse.ArgumentParser(description='Plotting args')
# parser.add_argument("--path", type=str, default="results/mapelites/lamp_1")
# parser.add_argument("--path", type=str, default="results/mapelites/dress_1")
parser.add_argument("--path", type=str, default="results/mapelites/chair_46")
# parser.add_argument("--path", type=str, default="results/mapelites/chair_45")
args = parser.parse_args()

df = pd.read_csv(f"{args.path}/df.csv", index_col="id")
with open(f"{args.path}/grids.pkl", "rb") as f:
    grid = pickle.load(f)

beh_dims = [dim for dim in grid.dims]
fig = go.Figure()
filtered_df = df[df["orig_iter"] == 0]
fig.add_trace(
    go.Scatter(
        x=filtered_df[beh_dims[0]],
        y=filtered_df[beh_dims[1]],
        mode='markers',
        name="Initial population",
    )
)
filtered_df = df.loc[df["in_population"]]
fig.add_trace(
    go.Scatter(
        x=filtered_df[beh_dims[0]],
        y=filtered_df[beh_dims[1]],
        mode='markers',
        name="Final population",
    )
)
fig.update_traces(marker={"opacity": 0.6})
fig.update_xaxes(title_text=beh_dims[0])
fig.update_yaxes(title_text=beh_dims[1])
for g in grid.dims[beh_dims[0]]:
    fig.add_vline(g, line_width=1, line_color="gray")
for g in grid.dims[beh_dims[1]]:
    fig.add_hline(g, line_width=1, line_color="gray")
fig.update_layout(
    xaxis_range=[
        2 * grid.dims[beh_dims[0]][0] - grid.dims[beh_dims[0]][1],
        2 * grid.dims[beh_dims[0]][-1] - grid.dims[beh_dims[0]][-2],
    ],
    yaxis_range=[
        2 * grid.dims[beh_dims[1]][0] - grid.dims[beh_dims[1]][1],
        2 * grid.dims[beh_dims[1]][-1] - grid.dims[beh_dims[1]][-2],
    ],
)
fig.show()

tie = TIE()
print(
    "Initial population TIE: ",
    tie.calculate(f"{args.path}/initial_population", truncate=8),
)
print(
    "Final Population TIE: ",
    tie.calculate(f"{args.path}/final_population", truncate=8),
)
