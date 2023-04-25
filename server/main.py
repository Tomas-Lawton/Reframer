import os
import uvicorn
from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ConnectionManager import ConnectionManager

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

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: int):
    await manager.connect(websocket)
    try:
        while True:
            user_data = await websocket.receive_json()
            await manager.process_user_request(user_data.status, user_data.data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"Disconnected Client: #{client_id}.")

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run("__main__:app", host="0.0.0.0", port=port, reload=True)