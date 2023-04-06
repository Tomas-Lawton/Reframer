import torch
import pydiffvg
from src.config import args
from src.drawing_model import Cicada

device = torch.device('cuda:0') if torch.cuda.is_available() else 'cpu'

NUM_ITER = 500
SAVE_PATH = "test/trace_fixing"
N_KEEP = 5

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

with torch.no_grad():
    pydiffvg.imwrite(
        cicada.img, f'results/{SAVE_PATH}/before.png', gamma=1,
    )

inds = list(range(-5, -1))


with torch.no_grad():
    for i in inds:
        cicada.drawing.traces[i].is_fixed = True
        cicada.points_vars[i].requires_grad = False
        cicada.stroke_width_vars[i].requires_grad = False
        cicada.color_vars[i].requires_grad = False

for t in range(NUM_ITER):
    cicada.run_epoch()

with torch.no_grad():
    pydiffvg.imwrite(
        cicada.img, f'results/{SAVE_PATH}/after.png', gamma=1,
    )
