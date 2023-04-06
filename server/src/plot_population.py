import pandas as pd
import plotly.graph_objects as go

path = "results/omg_mega/chair_12"

df = pd.read_csv(f"{path}/df.csv", index_col="id")

fig = go.Figure()
filtered_df = df.loc[df["orig_iter"] == 0]
fig.add_trace(
    go.Scatter(
        x=filtered_df[df.columns.values[-2]],
        y=filtered_df[df.columns.values[-1]],
        mode='markers',
        name="Initial Population",
    )
)
filtered_df = df.loc[df["orig_iter"] != 0]
fig.add_trace(
    go.Scatter(
        x=filtered_df[df.columns.values[-2]],
        y=filtered_df[df.columns.values[-1]],
        mode='markers',
        name="mutants",
    )
)
K = 11
for k in range(K):
    fig.add_vline(-0.15 + 0.03 * k, line_width=1, line_color="gray")
    fig.add_hline(-0.1 + 0.02 * k, line_width=1, line_color="gray")
fig.update_layout(title=path)
