from typing import Optional

from fastapi import FastAPI
from factory import CLIP

import skimage

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

    # clip_factory.convert_local_images("local_images")
    clip_factory.convert_local_images(skimage.data_dir)
    image_features = clip_factory.encode_images_from_local() 
    text_features = clip_factory.encode_text_classes()
    similarity = clip_factory.get_cosine_simalarity(text_features, image_features)
    # return {"Hello": str(clip_factory.images_rgb)}
    clip_factory.plot_test(similarity)
    return {"Hello": str(similarity)}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Optional[str] = None):
    return {"item_id": item_id, "q": q}