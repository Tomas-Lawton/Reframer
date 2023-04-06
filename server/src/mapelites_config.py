import argparse

parser = argparse.ArgumentParser(description='Sketching Agent Args')

# Partial sketch
parser.add_argument(
    "--svg_path",
    type=str,
    help="path to svg partial sketch",
    default="data/drawing_chair.svg",
)
parser.add_argument("--population_size", type=int, default=25)
parser.add_argument(
    "--prompt", type=str, help="what to draw", default="A red chair."
)
parser.add_argument(
    "--num_paths", type=int, help="number of strokes to add", default=32
)
parser.add_argument("--max_width", type=int, help="max px width", default=40)

parser.add_argument(
    "--num_iter", type=int, help="maximum algorithm iterations", default=1000
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
    "--save_path", type=str, help="subfolder for saving results", default="results/mapelites/chair"
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
parser.add_argument(
    "--behaviour_dims", type=str,
    help="conditioning behaviour words. Pairs (separated by ||) of words (separated by |)",
    default="abstract drawing|realistic photo||simple|complex"
)
parser.add_argument(
    "--grid_size", type=int, help="number of grid squares per behaviour dimension", default=9
)
parser.add_argument(
    "--mapelites_iters", type=int, help="mapelite iterations", default=100
)
args = parser.parse_args()

args.drawing_area = {'x0': args.x0, 'x1': args.x1, 'y0': args.y0, 'y1': args.y1}
