from dash import Dash, dcc, html, Input, Output, State
from dash_fig import plot_population
from search_alg import copy_df, search_alg, save_pop_data, get_image, recompute_behs


app = Dash(__name__)

# Define the layout of the app
app.layout = html.Div(
    [
        html.H1('Search Algorithm Demo'),
        html.Div(
            [
                "Initial Population: ",
                dcc.Input(id='input-load-pop', value="results/illuminate/chair_init_1"),
                html.Button("Load", id='button-load-pop'),
            ]
        ),
        html.Div(["Behaviour X: ", dcc.Input(id='input-beh-x', value="large")]),
        html.Div(["Behaviour Y: ", dcc.Input(id='input-beh-y', value="colorful")]),
        html.Button('Update behaviours', id='update-beh-button', n_clicks=0),
        html.Div(["Number of iterations: ", dcc.Input(id='input-num-iter', value=200)]),
        html.Div(["Vector Size: ", dcc.Input(id='input-vec-size', value=3)]),
        html.Div(["Learning Rate: ", dcc.Input(id='input-lr', value=1)]),
        html.Div(["Behaviour weight: ", dcc.Input(id='input-beh-weight', value=1)]),
        html.Div(["New individuals: ", dcc.Input(id='input-new-inds', value=1)]),
        html.Button('Run', id='run-button', n_clicks=0),
        html.Button('Save Population Data', id='save-button', n_clicks=0),
        html.Div(
            [
                dcc.Graph(
                    id="scatter-plot",
                    style={"height": "60vh", "width": "40%", "display": "inline-block"},
                ),
                html.Img(id="img", style={"height": "19vh", "width": "19vh"}),
            ]
        ),
        dcc.Store(id="plot-state"),
        dcc.Store(id="hidden"),
        dcc.Store(id="nothing1"),
        dcc.Store(id="nothing2"),
        dcc.Store(id="hidden-beh"),
    ]
)


@app.callback(
    Output("img", "src"), Input("scatter-plot", "clickData"),
)
def load_img(clickData):
    if clickData:
        img_id = clickData["points"][0]["id"]
        return get_image(f"results/tmp/images/{img_id}.png")


@app.callback(
    Output("hidden", "data"),
    [
        Input("button-load-pop", "n_clicks"),
        Input("hidden-beh", "data"),
    ],
    State("input-load-pop", "value")
)
def load_pop(n_clicks, _, value):
    copy_df(value)

@app.callback(
    Output("hidden-beh", "data"),
    Input("update-beh-button", "n_clicks"),
    [
        State("input-load-pop", "value"),
        State("input-beh-x", "value"),
        State("input-beh-y", "value"),
    ]

)
def update_behs(n_clicks, path, beh_x, beh_y):
    if n_clicks > 0:
        recompute_behs(path, [beh_x, beh_y])
    return


@app.callback(
    Output("nothing1", "data"), Input("save-button", "n_clicks"),
)
def save_data(n_clicks):
    if n_clicks > 0:
        save_pop_data()


@app.callback(
    Output("plot-state", "data"),
    Input("run-button", "n_clicks"),
    [
        State("input-load-pop", "value"),
        State("input-num-iter", "value"),
        State("input-vec-size", "value"),
        State("input-lr", "value"),
        State("input-beh-weight", "value"),
        State("input-new-inds", "value"),
    ],
)
def run_algorithm(n_clicks, path, num_iter, vec_size, lr, beh_weight, new_inds):
    if n_clicks == 0:
        return
    else:
        for n in range(int(new_inds)):
            print(f"Running algorithm, iter {n_clicks}, ind {n}...")
            data = search_alg(
                n_clicks,
                path,
                num_iter=int(num_iter),
                vec_size=float(vec_size),
                lr=float(lr),
                beh_weight=float(beh_weight),
            )
            print("Finished")
        return data


@app.callback(
    Output("scatter-plot", "figure"),
    [Input("plot-state", "data"), Input("hidden", "data")],
    State("input-load-pop", "value"),
)
def plot_pop(data, _, value):
    return plot_population(data, value)


if __name__ == '__main__':
    app.run_server(debug=True)
