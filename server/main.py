from typing import Optional

from fastapi import FastAPI
from factory import CLIP

app = FastAPI()
clip_factory = CLIP()

@app.get("/")
def read_root():
    clip_factory.set_image_descriptions({
    "page": "a page of text about segmentation",
    "chelsea": "a facial photo of a tabby cat",
    "astronaut": "a portrait of an astronaut with the American flag",
    "rocket": "a rocket standing on a launchpad",
    "motorcycle_right": "a red motorcycle standing in a garage",
    "camera": "a person looking at a camera on a tripod",
    "horse": "a black-and-white silhouette of a horse", 
    "coffee": "a cup of coffee on a saucer"
    })
    clip_factory.convert_local_images("local_images")
    return {"Hello": str(clip_factory.images_rgb)}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Optional[str] = None):
    return {"item_id": item_id, "q": q}