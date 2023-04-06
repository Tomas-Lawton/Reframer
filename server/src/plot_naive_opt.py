import pandas as pd
import plotly.graph_objects as go
from tie import TIE

tie = TIE()

names = ['chair', 'hat', 'lamp', 'pot', 'boat', 'dress', 'shoe', 'bust']


for name in names:
    df = pd.read_csv(f"results/naive/{name}_0/df.csv")
    print(tie.calculate(f"results/naive/{name}_0/images", truncate=8)),
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=df[df.columns.values[-2]], y=df[df.columns.values[-1]], mode='markers',
        )
    )
    fig.update_layout(title=name)
    fig.show()
