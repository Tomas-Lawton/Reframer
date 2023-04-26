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
    try:
        text_behaviour = TextBehaviour()
        use_one_dimension = user_data["behaviours"]["d1"]["name"] == "" or user_data["behaviours"]["d1"]["name"] == None
        if (use_one_dimension):
            text_behaviour.add_single_behaviour(user_data["behaviours"]["d0"]["name"])
        else:
            text_behaviour.add_behaviours(user_data["behaviours"]["d0"]["name"], user_data["behaviours"]["d1"]["name"])
    except KeyError:
        print("Missing dimension prompt(s)")

    behaviour_values = [i * behaviour_step - 1.5 for i in range(behaviours_range)]
    grid = [(a, b) for a in behaviour_values for b in behaviour_values]
    return grid, text_behaviour

def create_response(sketch: List, i: int, frame_size: int):
    """
    Renders a list of Cicada sketches to SVG files and returns a list of results dictionaries.
    """
    filename = f"results/temp-sketch-{i}.svg"
    shapes = [trace.shape for trace in sketch.drawing.traces]
    groups = [trace.shape_group for trace in sketch.drawing.traces]

    pydiffvg.save_svg(filename, frame_size, frame_size, shapes, groups)
    with open(f"results/temp-sketch-{i}.svg", "r") as f:
        return {
            "svg": f.read(),
            "iterations": args.num_iter,
            "fixed": sketch.drawing.fixed_list,
            "i": i
        }