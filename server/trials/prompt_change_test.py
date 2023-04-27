import torch
import pydiffvg
from src.config import args
from pathlib import Path
from src import utils
from src.drawing_model import Cicada

device = torch.device('cuda:0') if torch.cuda.is_available() else 'cpu'

prompt_A = 'A tall red chair.'
prompt_B = 'A short blue chair.'
NUM_ITER = 500
SVG_PATH = "data/drawing_chair.svg"
SAVE_PATH = "test/prompt_changes"
args.drawing_area = {'x0': args.x0, 'x1': args.x1, 'y0': 0.5, 'y1': 1.0}

save_path = Path("results/").joinpath(f'{SAVE_PATH}')
save_path.mkdir(parents=True, exist_ok=True)


# Using prompt A #################
args.prompt = prompt_A
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
cicada.process_text(args.prompt)
cicada.load_svg_shapes(args.svg_path)
cicada.add_random_shapes(args.num_paths)
cicada.initialize_variables()
cicada.initialize_optimizer()

for t in range(NUM_ITER):
    cicada.run_epoch()
    utils.printProgressBar(t + 1, args.num_iter, cicada.losses['global'].item())

with torch.no_grad():
    pydiffvg.imwrite(
        cicada.img, f'results/{SAVE_PATH}/before.png', gamma=1,
    )

# Using prompt B #################
args.prompt = prompt_B
cicada.process_text(args.prompt)

for t in range(NUM_ITER):
    cicada.run_epoch()
    utils.printProgressBar(t + 1, args.num_iter, cicada.losses['global'].item())

with torch.no_grad():
    pydiffvg.imwrite(
        cicada.img, f'results/{SAVE_PATH}/after.png', gamma=1,
    )
