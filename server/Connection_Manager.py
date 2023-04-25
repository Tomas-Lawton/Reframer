import torch
import clip
import json
from typing import List, Dict, Any
from pydantic import BaseModel
from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from src.run_cicada import create_cicada, run_cicada
from src.explorer import get_behaviour_grid, create_response
from src_old.cicada import Old_Cicada

class RequestModel(BaseModel):
    user_data: Dict[str, Any]

class ResponseModel(BaseModel):
    status: str
    result_sketch: Dict[str, Any]

def create_cicada_sync(websocket): #refactor out socket?
    if not torch.cuda.device_count():
        raise Exception("No CUDA devices found, running with CPU")
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    model, preprocess = clip.load('ViT-B/32', device, jit=False)
    return Old_Cicada(websocket, device, model)

class Connection_Manager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.main_sketch = create_cicada_sync(websocket)

    async def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        await self.main_sketch.stop()
        del self.main_sketch

    async def process_user_request(self, request: RequestModel):
            if request["status"] == "draw":
                self.main_sketch.use_sketch(request["user_data"])
                self.main_sketch.activate()
                self.main_sketch.draw() # socket included in loop for non-blocking socket

            if request["status"] == "continue_sketch":
                self.main_sketch.use_latest_sketch(request["user_data"])
                self.main_sketch.activate(False)
                self.main_sketch.draw()

            if request["status"] == "stop":
                await self.main_sketch.stop()

            if request["status"] == "explore_diverse_sketches":
                behaviour_grid, text_behaviour = get_behaviour_grid(request["user_data"])
                
                for i, (behaviour_a, behaviour_b) in enumerate(behaviour_grid):
                    cicada = create_cicada(text_behaviour, request["user_data"], behaviour_a, behaviour_b)
                    result_sketch = run_cicada(cicada, behaviour_a + behaviour_b)
                    response = create_response(result_sketch, i, request["user_data"]["frame_size"])
                    await self.broadcast_explore_sketch({"status":"Returned_Diverse_Sketch", "data": response})

    async def broadcast_explore_sketch(self, result_sketch: ResponseModel):
        for connection in self.active_connections:
            await connection.send_json(result_sketch)