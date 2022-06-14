from drawer import Drawer
from clip_instance import Clip_Instance
import logging
import os
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

# TO DO add environment var to set log mode
logging.basicConfig(
    level=logging.DEBUG,
    format=f'APP LOGGING: %(levelname)s %(name)s %(threadName)s : %(message)s',
)

logging.info("Starting App")

app = FastAPI(title="Clip Algorithm API")
origins = [
    "http://localhost",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:5500",
    "https://tomas-lawton.github.io",
    "https://tomas-lawton.github.io/drawing-client"
    "http://localhost:5500"
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
        os.environ.get('MONGODB_URI')
    )
    db = cluster["vector_ai"]
    collection = db["interaction_events"]
except ValueError as e:
    logging.error("Bad credentials \n", e)


@app.post("/save_interactions")
async def getInformation(info: Request):
    interaction_json = await info.json()
    print(interaction_json)
    try:
        collection.find_one_and_update(
            {"log_time": interaction_json["log_time"]}, # Log mode
            {"$set": {
                "user_id": interaction_json["user_id"],
                "recorded_data": interaction_json["recorded_data"]
                }
            },
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
    @app.websocket_route("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        artefact_drawer = Drawer(clip_class, websocket)
        # exemplar_drawers = [Drawer(clip_class, websocket, i) for i in range(4)]
        exemplar_drawers = []

        logging.info("Connecting...")
        try:
            await websocket.accept()
        except Exception as e:
            logging.error("Bad socket")

        try:
            while True:
                try:
                    data = await websocket.receive_json()
                    logging.info(data)
                except Exception as e:
                    logging.warning("Unexpected json received by socket")
                    await artefact_drawer.stop()
                    del artefact_drawer
                    for drawer in exemplar_drawers:
                        logging.info("Suspend Brainstorm")
                        await drawer.stop()
                        del drawer
                    break

                if data["status"] == "draw":
                    try:
                        await artefact_drawer.draw(data)
                    except Exception as e:
                        logging.error(e)
                        logging.error("Failed to update drawer")
                    artefact_drawer.run_async()

                if data["status"] == "redraw":
                    try:
                        await artefact_drawer.redraw()
                    except Exception as e:
                        logging.error(e)
                        logging.error("Failed to update drawer")
                    artefact_drawer.run_async()

                if data["status"] == "add_new_exemplar":
                    try:
                        new_exemplar = Drawer(clip_class, websocket, data["data"]["sketch_index"])
                        new_exemplar.frame_size = data["data"]['frame_size']
                        await new_exemplar.draw(data)
                        new_exemplar.run_async()
                        exemplar_drawers.append(new_exemplar)
                    except Exception as e:
                        logging.error(e)
                        logging.error("Failed to create a new exemplar")

                if data["status"] == "continue_sketch":
                    try:
                        await artefact_drawer.continue_update_sketch(data)
                    except Exception as e:
                        logging.error(e)
                        logging.error("Failed to update drawer for new sketch")
                    artefact_drawer.run_async()

                if data["status"] == "continue_single_sketch":
                    for drawer in exemplar_drawers:
                        if drawer.sketch_reference_index == data["data"]['sketch_index']:
                            try:
                                await drawer.continue_update_sketch(data, True)
                                drawer.run_async()
                            except Exception as e:
                                logging.error(e)
                                logging.error("Failed to update drawer for new sketch")

                if data["status"] == "prune":
                    await artefact_drawer.prune()
                    for drawer in exemplar_drawers:
                        logging.info("Pruning all sketches")
                        await drawer.prune()

                if data["status"] == "stop_single_sketch":
                    for drawer in exemplar_drawers:
                        if drawer.sketch_reference_index == data["data"]['sketch_index']:
                            await drawer.stop()
                            del drawer
                            break

                if data["status"] == "stop":
                    await artefact_drawer.stop()
                    for drawer in exemplar_drawers:
                        logging.info("Pausing Brainstorm")
                        await drawer.stop() #don't del because may restart
                        # del drawer

                # if data["status"] == "continue":
                #     try:
                #         await artefact_drawer.continue_update(data)
                #     except Exception as e:
                #         logging.error(e)
                #         logging.error("Failed to update drawer for continue (prompt)")
                #     artefact_drawer.run_async()

                # if data["status"] == "sketch_exemplars":
                #     for drawer in exemplar_drawers:
                #         drawer.frame_size = data["data"]['frame_size']
                #         await drawer.draw(data)
                #         drawer.run_async()

        except WebSocketDisconnect:
            await artefact_drawer.stop()
            del artefact_drawer
            for drawer in exemplar_drawers:
                logging.info("Suspend Brainstorm")
                await drawer.stop()
                del drawer
            logging.info("Client disconnected")

else:
    logging.info("Running without AI")

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
