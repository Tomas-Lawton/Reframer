import plotly.graph_objects as go
import pandas as pd
import pickle


def resize(xx):
    return [max([2.5, 2.5 * x ** 2]) for x in xx]


def plot_population(data, path):
    fig = go.Figure()
    K = 11
    for k in range(K):
        fig.add_vline(0.1 * k, line_width=1, line_color="gray")
        fig.add_hline(0.1 * k, line_width=1, line_color="gray")
    if data is None:
        df = pd.read_csv(f"{path}/df.csv", index_col="id")
        filtered_df = df.loc[df["orig_iter"] == 0]
        ids = filtered_df.index.tolist()
        fig.add_trace(
            go.Scatter(
                x=filtered_df[df.columns.values[-2]],
                y=filtered_df[df.columns.values[-1]],
                mode='markers',
                name="Initial Population",
                marker={"size": resize(filtered_df[df.columns.values[-3]])},
                text=[x for x in filtered_df[df.columns.values[-3]]],
                hovertemplate='<i>Fitness</i>: %{text:.5} <br>'
                + 'beh_x: %{x:.2f}<br>beh_y: %{y:.2f}',
                ids=ids,
            )
        )
        fig.update_layout(showlegend=True)
        fig.update_xaxes(title_text=df.columns.values[-2])
        fig.update_yaxes(title_text=df.columns.values[-1])

    else:
        fig.add_trace(
            go.Scatter(
                x=data["x_init"],
                y=data["y_init"],
                mode='markers',
                name="Initial Population",
                marker={"size": resize(data["f_init"])},
                text=[x for x in data["f_init"]],
                hovertemplate='<i>Fitness</i>: %{text:.2f} <br>'
                + 'beh_x: %{x:.2f}<br>beh_y: %{y:.2f}',
                ids=data["i_init"],
            )
        )
        fig.add_trace(
            go.Scatter(
                x=data["x_mut"],
                y=data["y_mut"],
                mode='markers',
                name="Mutants",
                marker={"size": resize(data["f_mut"])},
                text=[x for x in data["f_mut"]],
                hovertemplate='<i>Fitness</i>: %{text:.2f} <br>'
                + 'beh_x: %{x:.2f}<br>beh_y: %{y:.2f}',
                ids=data["i_mut"],
            )
        )
        fig.add_trace(
            go.Scatter(
                x=[data["x0"]],
                y=[data["y0"]],
                mode='markers',
                name="Centroid",
                marker={"symbol": "circle-cross-open"},
            )
        )
        fig.update_layout(
            annotations=[
                go.layout.Annotation(
                    dict(
                        x=data["x_target"],
                        y=data["y_target"],
                        xref="x",
                        yref="y",
                        text="",
                        showarrow=True,
                        axref="x",
                        ayref='y',
                        ax=data["x_neo"],
                        ay=data["y_neo"],
                        arrowhead=3,
                        arrowwidth=1.5,
                        arrowcolor='rgb(255,51,0)',
                    )
                )
            ],
        )
        with open(f"results/tmp/aux.pkl", "rb") as f:
            lines = pickle.load(f)
        for l, line in enumerate(lines):
            fig.add_trace(
                go.Scatter(
                    x=line["xx"],
                    y=line["yy"],
                    mode='lines',
                    name="connections",
                    legendgroup = "connections",
                    marker={"color": "RGB(200,200,200)"},
                    showlegend = l == 0    
                )
            )
        fig.update_xaxes(title_text=data["x_axis_name"])
        fig.update_yaxes(title_text=data["y_axis_name"])

    return fig
