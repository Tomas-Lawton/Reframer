from behaviour1D import TextBehaviour
from mapelites_config import args
from search_utils import PathManager, run_cicada, random_target
from datetime import datetime
import pandas as pd
import torch
import pickle
import random
import pydiffvg
import shortuuid
import os
import shutil

device = "cuda:0" if torch.cuda.is_available() else "cpu"

from PIL import Image


def get_image(path):
    return Image.open(path)


def copy_df(init_pop_path, save_path="results/tmp"):
    df = pd.read_csv(f"{init_pop_path}/df.csv", index_col="id")
    df.to_csv(f"{save_path}/df.csv", index_label="id")
    img_names = os.listdir(f"{init_pop_path}/images")
    with open(f"{save_path}/aux.pkl", "wb") as f:
        pickle.dump([], f)
    for img_name in img_names:
        shutil.copy2(f"{init_pop_path}/images/{img_name}", f"{save_path}/images")


def save_pop_data(load_path="results/tmp"):
    os.makedirs("results/saved", exist_ok=True)
    df = pd.read_csv(f"{load_path}/df.csv", index_col="id")
    now_str = datetime.now().strftime("%Y_%m_%d_%H_%M")
    df.to_csv(f"results/saved/{now_str}_df.csv", index_label="id")


def recompute_behs(init_pop_path, beh_words):
    df = pd.read_csv(f"{init_pop_path}/df.csv", index_col="id")
    text_behaviour = TextBehaviour()
    for beh_word in beh_words:
        text_behaviour.add_behaviour(beh_word)

    df = df.rename({
        df.columns.values[-2]: beh_words[0],
        df.columns.values[-1]: beh_words[1],
        }, axis=1)

    for id in df.index.tolist():
        with open(f"{init_pop_path}/{id}.pkl", "rb") as f:
            drawing = pickle.load(f)
        
        behs = text_behaviour.eval_behaviours(drawing.img)
        for b, bword in enumerate(beh_words):
            df.loc[id, bword] = behs[b].item()

    df.to_csv(f"{init_pop_path}/df.csv", index_label="id")
    return

def search_alg(
    i,
    init_pop_path,
    save_path="results/tmp",
    num_iter=100,
    vec_size=2,
    lr=1,
    beh_weight=1,
):
    path_man = PathManager(save_path, init_pop_path)
    df = pd.read_csv(f"{save_path}/df.csv", index_col="id")
    with open(f"{path_man.alt_path}/behaviour.pkl", "rb") as f:
        text_behaviour = pickle.load(f)

    mutant_id = random.choice(df.loc[df["in_population"]].index)
    target_vec, x0, y0 = random_target(mutant_id, df, sigma=1, weight=vec_size)
    drawing = path_man.load_file(mutant_id, "pkl")
    drawing.id = shortuuid.uuid()
    fitness, behs, drawing = run_cicada(
        args,
        text_behaviour,
        target_behaviours=target_vec,
        drawing=drawing,
        mutate=False,
        num_iter=num_iter,
        omg_mega=False,
        lr_weight=lr,
        beh_weight=beh_weight,
    )
    df.loc[drawing.id] = [True, i + 1, fitness] + behs
    df.to_csv(f"{path_man.this_path}/df.csv", index_label="id")
    with open(f"{path_man.this_path}/{drawing.id}.pkl", "wb") as f:
        pickle.dump(drawing, f)

    img = drawing.img.cpu().permute(0, 2, 3, 1).squeeze(0)
    pydiffvg.imwrite(
        img, f"{path_man.this_path}/images/{drawing.id}.png", gamma=1,
    )
        
    data = {}
    data["x_axis_name"] = df.columns.values[-2]
    data["y_axis_name"] = df.columns.values[-1]
    data["x0"] = x0
    data["y0"] = y0
    filtered_df = df.loc[df["orig_iter"] == 0]
    data["f_init"] = filtered_df[df.columns.values[-3]]
    data["x_init"] = filtered_df[df.columns.values[-2]]
    data["y_init"] = filtered_df[df.columns.values[-1]]
    data["i_init"] = filtered_df.index.tolist()
    filtered_df = df.loc[df["orig_iter"] != 0]
    data["f_mut"] = filtered_df[df.columns.values[-3]].tolist()
    data["x_mut"] = filtered_df[df.columns.values[-2]].tolist()
    data["y_mut"] = filtered_df[df.columns.values[-1]].tolist()
    data["i_mut"] = filtered_df.index.tolist()
    filtered_df = df.loc[mutant_id]
    data["f_neo"] = filtered_df[df.columns.values[-3]]
    data["x_neo"] = filtered_df[df.columns.values[-2]]
    data["y_neo"] = filtered_df[df.columns.values[-1]]
    data["i_neo"] = filtered_df.index.tolist()
    data["x_target"] = target_vec[0]
    data["y_target"] = target_vec[1]

    with open(f"{path_man.this_path}/aux.pkl", "rb") as f:
        lines = pickle.load(f)
    lines.append({
        "xx": [data["x_mut"][-1], data["x_neo"]],   
        "yy": [data["y_mut"][-1], data["y_neo"]],
    })
    with open(f"{path_man.this_path}/aux.pkl", "wb") as f:
        pickle.dump(lines, f)

    return data
