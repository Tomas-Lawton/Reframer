from typing import List, Dict
import pydiffv

from src.behaviour import TextBehaviour
from src.run_cicada import create_cicada, run_cicada
from src.config import args

def get_loss(cicada):
  return cicada.losses['global'].item()

def get_top_sketches(user_data: Dict, behaviours_range: int = 4, behaviour_step: float = 0.75) -> List:
    """
    Generates a grid of behaviour offsets for Cicada to target and returns the top 4 sketches sorted by global loss.
    """
    text_behaviour = TextBehaviour()
    text_behaviour.add_behaviour(user_data["behaviours"]["d0"]["name"], user_data["behaviours"]["d1"]["name"])
    
    # Generate a grid of behaviour offsets 
    behaviour_values = [i * behaviour_step - behaviours_range/2 for i in range(behaviours_range)]
    behaviour_grid = [(a, b) for a in behaviour_values for b in behaviour_values]
    
    # Generate a list of top sketches
    top_sketches = [run_cicada(create_cicada(text_behaviour, user_data, behaviour_a, behaviour_b)) for (behaviour_a, behaviour_b) in behaviour_grid]
    
    # Sort top sketches by global loss and return top 4
    return sorted(top_sketches, key=get_loss)[:4]

def render_results(top_sketches: List, frame_size: int) -> List:
    """
    Renders a list of Cicada sketches to SVG files and returns a list of results dictionaries.
    """
    rendered_results = []
    for i, cicada in enumerate(top_sketches):
        filename = f"results/temp-sketch-{i}.svg"
        shapes = [trace.shape for trace in cicada.drawing.traces]
        groups = [trace.shape_group for trace in cicada.drawing.traces]
        pydiffvg.save_svg(filename, frame_size, frame_size, shapes, groups)

        # re-evaluate the score for the dimensions and return them
        # evaluation_score = text_behaviour.eval_behaviours(cicada.img, showme=True)
        
        with open(f"results/temp-sketch-{i}.svg", "r") as f:
            rendered_results.append({
                "svg": f.read(),
                "iterations": args.num_iter,
                "fixed": cicada.drawing.fixed_list
            })

    return rendered_results