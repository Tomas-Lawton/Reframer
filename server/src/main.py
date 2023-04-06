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

Run 16 sketches for 500 iterat ions and show the best subset (four) to the user. 
Run top 8 sketches for 500 iterat ions and show the best subset (four) to the user. ------> Instead of the top sketches could take the sketches that are most diverse from each other.
Now return only the top 4 sketches.

We can display the top 4 sketches or the top 2 sketches for each dimension. Or we can get the four sketches which are most diverse.
We don't need to tell a user which ones are more fluffy or real we can just let the user see the result. 
Or maybe it's better to give values for how much of each dimension is in the result e.g 10% fluffy vs 5% real.
'''



import logging
import os
import uvicorn

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from cicada import CICADA
import torch
import clip
import pydiffvg

# TO DO add environment var to set log mode
logging.basicConfig(
    level=logging.DEBUG,
    format=f'APP LOGGING: %(levelname)s %(name)s %(threadName)s : %(message)s',
)

logging.info("Starting App")
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
logging.info(f"Running with {str(device)}")

app = FastAPI(title="Clip Algorithm API")
origins = [
    "http://127.0.0.1:8000",
    "https://tomas-lawton.github.io/drawing-client",
    "https://tomas-lawton.github.io",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




@app.post("/save_interactions")
async def getInformation(info: Request):
    interaction_json = await info.json()
    
    try:
        collection.find_one_and_update(
            {"log_time": interaction_json["log_time"]},  # Log mode
            {
                "$set": {
                    "user_id": interaction_json["user_id"],
                    "recorded_data": interaction_json["recorded_data"],
                }
            },
            upsert=True,
        )
        return {
            "status": "SUCCESS",
        }
    except Exception as e:
        logging.error(e)

# Refactor as dictionary
def kill(d, a):
    a.is_running = False
    for drawer in d:
        drawer.is_running = False
        del drawer

@app.websocket_route("/ws")
async def websocket_endpoint(websocket: WebSocket):
    try:
        await websocket.accept()
    except Exception as e:
        logging.error("Bad socket")

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print("Running with ", str(device))
    model, preprocess = clip.load('ViT-B/32', device, jit=False)
    main_sketch = CICADA(websocket, device, model)

    #refactor in mainrefactor branch
    sketches = []
    pydiffvg.set_print_timing(False)
    pydiffvg.set_use_gpu(torch.cuda.is_available())
    pydiffvg.set_device(device)

    try:
        while True:
            try:
                data = await websocket.receive_json()
                logging.info(data)
            except RuntimeError:
                logging.warning("Unexpected json received by socket")
                await main_sketch.stop()
                del main_sketch
                for drawer in sketches:
                    logging.info("Suspend Brainstorm")
                    await drawer.stop()
                    del drawer


            if data["status"] == "draw":
                main_sketch.use_sketch(data)
                main_sketch.activate(True)
                main_sketch.draw()




            if data["status"] == "add_new_sketch":
                new_sketch = CICADA(
                        websocket, device, model, data["data"]["sketch_index"]
                )
                sketches.append(new_sketch)
                new_sketch.use_sketch(data)
                new_sketch.activate(True)
                new_sketch.draw()

            if data["status"] == "continue_sketch":
                main_sketch.use_latest_sketch(data)
                main_sketch.activate(False)
                main_sketch.draw()

            if data["status"] == "prune":
                main_sketch.use_sketch(data)
                main_sketch.activate(False)
                main_sketch.prune()
                await main_sketch.render_client(main_sketch.iteration, None, True)

            if data["status"] == "stop_single_sketch":
                for drawer in sketches:
                    if (
                        drawer.index
                        == data["data"]['sketch_index']
                    ):
                        await drawer.stop()
                        del drawer

            if data["status"] == "stop":
                await main_sketch.stop()
    
    # Use new refactor
    except WebSocketDisconnect:
        kill(sketches, main_sketch)
        logging.info("Client disconnected")

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
