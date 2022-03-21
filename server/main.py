from typing import Optional

from fastapi import FastAPI
from factory import CLIP

import skimage
import numpy as np

app = FastAPI()
clip_factory = CLIP()

@app.get("/")
def read_root():
    """Requires at least one image for each class so an image is classifed"""
    clip_factory.set_image_descriptions({
    # "chelsea": "a facial photo of a tabby cat",
    "astronaut": "a portrait of an astronaut with the American flag",
    # "rocket": "a rocket standing on a launchpad",
    # "university": "a picture of higher education",
    # "page": "a page of text about segmentation",
    # "motorcycle_right": "a red motorcycle standing in a garage",
    # "camera": "a person looking at a camera on a tripod",
    # "horse": "a black-and-white silhouette of a horse", 
    # "coffee": "a cup of coffee on a saucer"
    })

    clip_factory.convert_local_images("local_images")
    # clip_factory.convert_local_images(skimage.data_dir)

    image_features = clip_factory.encode_images_from_local(np.stack(clip_factory.images_rgb)) 
    # text_features = clip_factory.encode_text_classes(["This is " + desc for desc in clip_factory.classes])
    # similarity = clip_factory.get_cosine_simalarity(text_features, image_features)
    # clip_factory.plot_test(similarity)
    clip_factory.create_zero_shot_image_classifier()
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Optional[str] = None):
    return {"item_id": item_id, "q": q}