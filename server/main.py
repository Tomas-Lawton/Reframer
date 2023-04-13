from typing import List, Dict
import uvicorn
from pydantic import BaseModel
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from src.explorer import get_top_sketches, render_results

if not torch.cuda.device_count():
    raise Exception("No CUDA devices found, running with CPU")

app = FastAPI(title="CICADA Backend")

ALLOWED_ORIGINS = [
    "http://127.0.0.1:8000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:5501",
    "127.0.0.1:5500",
    "null"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RequestModel(BaseModel):
    user_data: Dict[str, Any]
class ResponseModel(BaseModel):
    status: str
    diverse_sketches: List[Dict[str, Any]]

@app.get("/explore_diverse_sketches")
async def explore() -> Dict[str, str]:
    return {
        "status": "SUCCESS",
    }

@app.post("/explore_diverse_sketches")
async def explore(request: RequestModel) -> ResponseModel:
    """
    Given a user's data, returns a list of diverse sketches.
    """
    try:
        top_sketches = get_top_sketches(request.user_data)
        results = render_results(top_sketches, request.user_data["frame_size"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return ResponseModel(status="returned_diverse_sketches", diverse_sketches=results)

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run("__main__:app", host="0.0.0.0", port=port, reload=True)
