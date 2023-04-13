
import os
import torch
import uvicorn
import torch
import pydiffvg

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from src.behaviour import TextBehaviour
from src.run_cicada import create_cicada, run_cicada
from src.config import args

if not torch.cuda.device_count():
    raise Exception("No CUDA Devices Found")

'''
Generate -> Return them to FE. 
Set up the stuffs, and listen for a message with the prompt, sketch and dimensions
Assuming a loading screen HTTP is better. But, assuming live loading they should be shown. However, since we only show a subset they should be loaded.
Use standard CICADA. 

SETUP
Generate: Initialise text behvaiour class.

DRAW
Add behaviours. -> Add option for remove behaviours
Evaluate the behaviours for starting values.
Initialise the sketches (16 CICADAS): -----> Refactor to make them async based on model code.
    For each, push the sketch to a new target by adding the BOOSTED dimensions
    Wait for a while. 

Run 16 sketches for 500 iterations and show the best subset (four) to the user. 
Run top 8 sketches for 500 iterat ions and show the best subset (four) to the user. ------> Instead of the top sketches could take the sketches that are most diverse from each other.
Now return only the top 4 sketches.

We can display the top 4 sketches or the top 2 sketches for each dimension. Or we can get the four sketches which are most diverse.
We don't need to tell a user which ones are more fluffy or real we can just let the user see the result. 
Or maybe it's better to give values for how much of each dimension is in the result e.g 10% fluffy vs 5% real.
'''

app = FastAPI(title="CICADA Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://127.0.0.1:8000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:5501",
    "127.0.0.1:5500",
    "null"
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/explore_diverse_sketches")
async def explore(user_inputs: Request):
    return {
        "status": "SUCCESS",
        "hello": "world"
    }

@app.post("/explore_diverse_sketches")
async def explore(req: Request):
    response = await req.json()
    
    top_sketches = explore(response["user_data"]) # could repeat this
    results = render_results(top_sketches, response["user_data"]["frame_size"])

    return {
        "status": "returning_diverse_sketches",
        "diverse_sketches": results
    }


def get_loss(s):
  return s.losses['global'].item()

def explore(user_data):
    text_behaviour = TextBehaviour()
    text_behaviour.add_behaviour(user_data["behaviours"]["d0"]["name"], user_data["behaviours"]["d1"]["name"])    

    top_sketches = []
    for b in range(4):
        for a in range(4):
            #use less
            user_data["behaviours"]["d0"]["value"] = a*.2 -.3
            user_data["behaviours"]["d1"]["value"] = b*.2 -.3

            print("Creating sketch for: ", user_data["prompt"])
            print("Bias for ", user_data["behaviours"]["d0"]["name"]," : ", user_data["behaviours"]["d0"]["value"])
            print("Bias for ", user_data["behaviours"]["d1"]["name"]," : ", user_data["behaviours"]["d1"]["value"])

            cicada = create_cicada(text_behaviour, user_data)
            cicada = run_cicada(cicada, b+a)
            top_sketches.append(cicada)

    top_sketches.sort(key=get_loss)
    top_sketches = top_sketches[:4]

    print(top_sketches)
    return top_sketches


def render_results(top_sketches, frame_size):
    diverse_sketches = []
    for cicada in top_sketches:
        #todo refactor
        shapes = [trace.shape for trace in cicada.drawing.traces]
        shape_groups = [trace.shape_group for trace in cicada.drawing.traces]
        pydiffvg.save_svg(
            f"results/temp-sketch.svg",
            frame_size, 
            frame_size,
            shapes,
            shape_groups,
        )
        with open(f"results/temp-sketch.svg", "r") as f:
            diverse_sketches.append({
                "svg": f.read(),
                "iterations": args.num_iter,
                "fixed": cicada.drawing.fixed_list
            })

    return diverse_sketches




if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run("__main__:app", host="0.0.0.0", port=port, reload=True)
