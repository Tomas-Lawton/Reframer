
import os
import torch
import uvicorn

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from src.behaviour import TextBehaviour
from src.run_cicada import create_cicada, run_cicada

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
origins = [
    "http://127.0.0.1:8000",
    "https://tomas-lawton.github.io/drawing-client",
    "https://tomas-lawton.github.io",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "127.0.0.1:5500/web"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    user_data = await req.json()
    print(user_data["data"])
    results = explore(user_data["data"]) # could repeat this over

    return {
        "status": "SUCCESS",
        "diverse_sketches": "done"
    }


def get_loss(s):
  return s.losses['global'].item()

def explore(user_data):
    text_behaviour = TextBehaviour()
    b0 = user_data["behaviours"]["d0"]
    b1 = user_data["behaviours"]["d1"]
    text_behaviour.add_behaviour(b0, b1)    

    top_sketches = []
    for b in range(4):
        for a in range(4):
            user_data["behaviours"]["bias_a"] = a*.2 -.3
            user_data["behaviours"]["bias_b"] = b*.2 -.3

            cicada = create_cicada(text_behaviour, user_data)
            cicada = run_cicada(cicada)
            top_sketches.append(cicada)

    top_sketches.sort(key=get_loss)
    top_sketches = top_sketches[:4]
    return top_sketches



if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run("__main__:app", host="0.0.0.0", port=port, reload=True)
