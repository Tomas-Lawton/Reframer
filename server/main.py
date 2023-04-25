import os
import uvicorn
import json
from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from Connection_Manager import Connection_Manager

app = FastAPI(title="CICADA/Reframer Backend")

ALLOWED_ORIGINS = [
    "http://127.0.0.1:8000",
    "http://127.0.0.1:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = Connection_Manager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    print("User connected: ", client_id)
    try:
        while True:
            user_data = await websocket.receive_json()
            await manager.process_user_request(user_data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"Disconnected Client: #{client_id}.")

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run("__main__:app", host="0.0.0.0", port=port, reload=True)