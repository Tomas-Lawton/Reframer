from drawer import Drawer
from clip_instance import Clip_Instance

import logging
import os
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

# TO DO add environment var to set log mode
logging.basicConfig(
    # encoding='utf-8',
    level=logging.DEBUG,
    format=f'APP LOGGING: %(levelname)s %(name)s %(threadName)s : %(message)s',
)

app = FastAPI(title="Clip Algorithm API")
origins = [
    "http://localhost",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    cluster = MongoClient(
        f"mongodb+srv://{os.environ.get('DBCREDENTIAL')}@cluster0.x5opj.mongodb.net/?retryWrites=true&w=majority"
    )
    db = cluster["vector_ai"]
    collection = db["interaction_events"]
except ValueError as e:
    logging.error("Bad credentials \n", e)


@app.post("/save_interactions")
async def getInformation(info: Request):
    interaction_json = await info.json()
    try:
        collection.find_one_and_update(
            {"user_id": interaction_json["user_id"]},
            {"$set": {"recorded_data": interaction_json["recorded_data"]}},
            upsert=True,
        )
        return {
            "status": "SUCCESS",
        }
    except Exception as e:
        logging.error(e)


@app.get("/")
async def home():
    return {"hello", "world"}




if os.environ.get('CONNECTAI') == "True":
    logging.info("Starting with AI Socket")
    clip_class = Clip_Instance()
    logging.info("Loaded Clip...")
    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        artefact_drawer = Drawer(clip_class, websocket)
        exemplar_drawers = [Drawer(clip_class, websocket, i) for i in range(4)]
        logging.info("Connecting...")
        await websocket.accept()
        logging.info("Websocket Client Connected")
        try:
            while True:
                data = await websocket.receive_json()

                if data["status"] == "draw":
                    try:
                        await artefact_drawer.draw_update(data)
                    except Exception as e:
                        logging.error(e)
                        logging.error("Failed to update drawer")
                    artefact_drawer.run_loop()

                if data["status"] == "redraw":
                    try:
                        await artefact_drawer.redraw_update()
                    except Exception as e:
                        logging.error(e)
                        logging.error("Failed to update drawer")
                    artefact_drawer.run_loop()

                if data["status"] == "continue":
                    try:
                        await artefact_drawer.continue_update(data)
                    except Exception as e:
                        logging.error(e)
                        logging.error("Failed to update drawer")
                    artefact_drawer.run_loop()

                if data["status"] == "sketch_exemplars":
                    for drawer in exemplar_drawers:
                        drawer.frame_size = data["data"]['frame_size']
                        await drawer.draw_update(data)
                        drawer.run_loop()

                if data["status"] == "stop":
                    await artefact_drawer.stop()
                    for drawer in exemplar_drawers:
                        await drawer.stop()

        except WebSocketDisconnect:
            await artefact_drawer.stop()
            logging.info("Client disconnected")

else:
    logging.info("Running without AI")

# if __name__ == "__main__":
#     uvicorn.run(app, host="0.0.0.0", port=8000)
