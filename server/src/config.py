import argparse

parser = argparse.ArgumentParser(description='Sketching Agent Args')

# Partial sketch
parser.add_argument(
    "--svg_path",
    type=str,
    help="path to svg partial sketch",
    default="data/drawing_chair.svg",
)

# CLIP prompts
parser.add_argument(
    "--prompt", type=str, help="what to draw", default="A red chair."
)
parser.add_argument("--neg_prompt", type=str, default="Written words.")
parser.add_argument("--neg_prompt_2", type=str, default="Text.")
parser.add_argument("--use_neg_prompts", type=bool, default=True)
parser.add_argument("--normalize_clip", type=bool, default=True)

# Canvas parameters
parser.add_argument(
    "--num_paths", type=int, help="number of strokes to add", default=32
)
parser.add_argument("--canvas_h", type=int, help="canvas height", default=224)
parser.add_argument("--canvas_w", type=int, help="canvas width", default=224)
parser.add_argument("--max_width", type=int, help="max px width", default=40)

# Algorithm parameters
parser.add_argument(
    "--num_iter", type=int, help="maximum algorithm iterations", default=500
)
parser.add_argument(
    "--w_points",
    type=float,
    help="regularization parameter for Bezier point distance",
    default=0.001,
)
parser.add_argument(
    "--w_colors",
    type=float,
    help="regularization parameter for color differences",
    default=0.01,
)
parser.add_argument(
    "--w_widths",
    type=float,
    help="regularization parameter for width differences",
    default=0.001,
)
parser.add_argument(
    "--w_img",
    type=float,
    help="regularization parameter for image L2 similarity",
    default=0.00,
)
parser.add_argument(
    "--w_geo",
    type=float,
    help="regularization parameter for geometric similarity",
    default=3.5,
)
parser.add_argument("--x0", type=float, help="coordinate for drawing area", default=0.0)
parser.add_argument("--x1", type=float, help="coordinate for drawing area", default=1.0)
parser.add_argument("--y0", type=float, help="coordinate for drawing area", default=0.5)
parser.add_argument("--y1", type=float, help="coordinate for drawing area", default=1.0)
parser.add_argument(
    "--num_trials", type=int, help="number of times to run the algorithm", default=1
)
parser.add_argument(
    "--num_augs",
    type=int,
    help="number of augmentations for computing semantic loss",
    default=4,
)
parser.add_argument(
    "--prune_ratio", type=float, help="ratio of paths to be pruned out", default=0.4
)
parser.add_argument("--n_prunes", type=int, help="number of pruning stages", default=1)

# Saving
parser.add_argument(
    "--save_path", type=str, help="subfolder for saving results", default="chair"
)
parser.add_argument(
    "--build_gif", type=bool, help="build a gif of the process", default=False
)
parser.add_argument(
    "--lr_boost", type=bool, help="mutate using lr boost", default=False
)
parser.add_argument(
    "--respawn_traces", type=bool, help="mutate respawning traces", default=False
)
parser.add_argument(
    "--area_kill", type=bool, help="mutate area kill", default=False
)

args = parser.parse_args()

args.drawing_area = {'x0': args.x0, 'x1': args.x1, 'y0': args.y0, 'y1': args.y1}
