from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import logging
from class_interface import Clip_Class
from clip_draw import Clip_Draw_Optimiser

# TO DO add environment var to set log mode
logging.basicConfig(
    encoding='utf-8',
    level=logging.DEBUG,
    format=f'APP LOGGING: %(levelname)s %(name)s %(threadName)s : %(message)s',
)

app = FastAPI(title="Clip Algorithm API")
origins = [
    "http://localhost",
    "http://localhost:8080",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clip_class = Clip_Class()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    artefact_drawer = Clip_Draw_Optimiser(clip_class, websocket)
    exemplar_drawers = [Clip_Draw_Optimiser(clip_class, websocket, i) for i in range (4)]

    await websocket.accept()
    logging.info("Websocket Client Connected")
    try:
        while True:
            data = await websocket.receive_json()

            if data["status"] == "draw":
                try:
                    await artefact_drawer.draw_update(data)
                except:
                    logging.error("Failed to update drawer")
                artefact_drawer.run_loop()

            if data["status"] == "redraw":
                try:
                    await artefact_drawer.redraw_update()
                except:
                    logging.error("Failed to update drawer")
                artefact_drawer.run_loop()

            if data["status"] == "continue":
                try:
                    await artefact_drawer.continue_update(data)
                except:
                    logging.error("Failed to update drawer")
                artefact_drawer.run_loop()

            if data["status"] == "stop":
                await artefact_drawer.stop()
                for drawer in exemplar_drawers:
                    await drawer.stop()
            
            if data["status"] == "sketch_exemplars":
                for drawer in exemplar_drawers:
                    drawer.frame_size = data["data"]['frame_size']
                    # Use info from other drawer? Or should grab directly from UI???
                    # For now just use same data as drawing.
                    await drawer.draw_update(data)
                    drawer.run_loop()

    except WebSocketDisconnect:
        await artefact_drawer.stop()
        logging.info("Client disconnected")