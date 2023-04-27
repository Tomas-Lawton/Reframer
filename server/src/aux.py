import pickle
import pandas as pd
import os
import pydiffvg

names = ['chair', 'hat', 'lamp', 'pot', 'boat', 'dress', 'shoe', 'bust']
for name in names:
    df = pd.read_csv(f"results/naive/{name}_0/df.csv")
    os.makedirs(f"results/naive/{name}_0/images", exist_ok=True)
    for drawing_id in df['id']:
        with open(f"results/naive/{name}_0/{drawing_id}.pkl", "rb") as f:
            drawing = pickle.load(f)

        img = drawing.img.cpu().permute(0, 2, 3, 1).squeeze(0)
        pydiffvg.imwrite(
            img, f"results/naive/{name}_0/images/{drawing_id}.png", gamma=1,
        )
