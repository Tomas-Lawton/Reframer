import pydiffvg
from typing import List, Dict
from src.behaviour import TextBehaviour
from src.config import args

def get_loss(cicada):
  return cicada.losses['global'].item()

def get_behaviour_grid(user_data: Dict, behaviours_range: int = 4, 
                     behaviour_step: float = 0.75, top_sketches: List = []) -> List:
    """
    Generates a grid of behaviour offsets for Cicada to target.
    """
    text_behaviour = TextBehaviour()
    text_behaviour.add_behaviour(user_data["behaviours"]["d0"]["name"], user_data["behaviours"]["d1"]["name"])
    behaviour_values = [i * behaviour_step - 1.5 for i in range(behaviours_range)]
    grid = [(a, b) for a in behaviour_values for b in behaviour_values]
    return grid, text_behaviour

def create_response(sketch: List, i, frame_size: int) -> List:
    """
    Renders a list of Cicada sketches to SVG files and returns a list of results dictionaries.
    """
    filename = f"results/temp-sketch-{i}.svg"
    shapes = [trace.shape for trace in sketch.drawing.traces]
    groups = [trace.shape_group for trace in sketch.drawing.traces]
    # dimension_scores = text_behaviour.eval_behaviours(cicada.img, showme=True)
    pydiffvg.save_svg(filename, frame_size, frame_size, shapes, groups)
    with open(f"results/temp-sketch-{i}.svg", "r") as f:
        return {
            "svg": f.read(),
            "iterations": args.num_iter,
            "fixed": sketch.drawing.fixed_list,
        }