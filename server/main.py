
import os
import torch
import uvicorn

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from src.behaviour import TextBehaviour
from src.run_cicada import run_single_sketch

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




# app = FastAPI(title="CICADA Backend")
# origins = [
#     "http://127.0.0.1:8000",
#     "https://tomas-lawton.github.io/drawing-client",
#     "https://tomas-lawton.github.io",
#     "http://localhost:5500",
#     "http://127.0.0.1:5500"
# ]
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# @app.post("/explore_diverse_sketches")
# async def explore(user_inputs: Request):
#     json_data = await user_inputs.json()
#     print(json_data)

##INSERT CODE HERE

#     diverse_sketches = []
#     return {
#         "status": "SUCCESS",
#         "diverse_sketches": diverse_sketches
#     }


# Test here first

user_behaviour_one = "drawing"
user_behaviour_two = "photo"
user_sketch = ""
user_prompt = ""

text_behaviour = TextBehaviour()
text_behaviour.add_behaviour(user_behaviour_one, user_behaviour_two)
# text_behaviour.add_behaviour("simple", "complex")

run_single_sketch(text_behaviour)

# for i in range(16):
#     run_single_sketch(text_behaviour)
    