import torch
import pydiffvg
import datetime

from pathlib import Path
from src.drawing_model import Cicada
from src import utils
from src.config import args

device = torch.device('cuda:0') if torch.cuda.is_available() else 'cpu'

# Build dir if does not exist & make sure using a
# trailing / or not does not matter
save_path = Path("results/").joinpath(args.save_path)
save_path.mkdir(parents=True, exist_ok=True)
save_path = str(save_path) + '/'

prune_places = [
    round(args.num_iter * (k + 1) * 0.8 / args.n_prunes) for k in range(args.n_prunes)
]
p0 = args.prune_ratio


def create_cicada(text_behaviour, user_data, a, b):
    args.prune_ratio = p0 / len(prune_places)

    cicada = Cicada(
        device=device,
        canvas_w=args.canvas_w,
        canvas_h=args.canvas_h,
        drawing_area=args.drawing_area,
        max_width=args.max_width,
    )
    cicada.set_penalizers(
        w_points=args.w_points,
        w_colors=args.w_colors,
        w_widths=args.w_widths,
        w_img=args.w_img,
        w_geo=args.w_geo,
    )

    try:
        cicada.process_text(user_data["prompt"])
        if "sketch" in user_data:
            cicada.process_sketch(user_data["sketch"], user_data["frame_size"])
    except Exception as e:
            print("Problem during initialization \n", e)

    cicada.add_random_shapes(user_data["random_curves"])

    if len(cicada.drawing.traces) > 0 and cicada.drawing.img is not None:
            cicada.initialize_variables()
            cicada.initialize_optimizer()

    img = cicada.build_img("deprecated") #slightly different every time
    cicada.img = img.cpu().permute(0, 2, 3, 1).squeeze(0)

    try:
        use_one_dimension = user_data["behaviours"]["d1"]["name"] == "" or user_data["behaviours"]["d1"]["name"] == None
        if (use_one_dimension):    
            evaluation_score = text_behaviour.eval_single_behaviour(cicada.img, showme=True)
            cicada.add_behaviour(user_data["behaviours"]["d0"]["name"], a + float(evaluation_score.item()))       
        else:
            evaluation_score = text_behaviour.eval_behaviours(cicada.img, showme=True)
            cicada.add_behaviour(user_data["behaviours"]["d0"]["name"], a + float(evaluation_score.item()))
            cicada.add_behaviour(user_data["behaviours"]["d1"]["name"], b + float(evaluation_score.item()))
    except KeyError:
        print("Missing dimension prompt(s)")
        
    return cicada


def run_cicada(cicada, c):
    # Run the main optimization loop
    time_str = (datetime.datetime.today() + datetime.timedelta(hours=11)).strftime(
        "%Y_%m_%d_%H_%M_%S"
    )

    with torch.no_grad():
        pydiffvg.imwrite(
            cicada.img0.detach().cpu().squeeze(0).permute(1, 2, 0),
            save_path + time_str + str(c) + '00.png',
            gamma=1,
        )

    for t in range(args.num_iter):
        if (t + 1) % args.num_iter // 50:
            with torch.no_grad():
                pydiffvg.imwrite(
                    cicada.img, save_path + time_str + str(c) +  '.png', gamma=1,
                )

        cicada.run_epoch()

        utils.printProgressBar(t + 1, args.num_iter, cicada.losses['global'].item())

    pydiffvg.imwrite(
        cicada.img, save_path + time_str + str(c) + '.png', gamma=1,
    )
    utils.save_data(save_path, time_str + str(c), args)

    return cicada
