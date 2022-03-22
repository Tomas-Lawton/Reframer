from typing import Optional

from fastapi import FastAPI
from factory import CLIP

import skimage
import numpy as np
import logging
from plot_util import plot_cosines, plot_zero_shot_images

# add filename='logs.log'
logging.basicConfig(encoding='utf-8', level=logging.DEBUG, format=f'APP LOGGING: %(levelname)s %(name)s %(threadName)s : %(message)s')

app = FastAPI()
clip_factory = CLIP()

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/set_descriptions")
def set_descriptions():
    """Requires at least one image for each class so an image is classifed"""

    clip_factory.set_image_descriptions({
    "chelsea": "a facial photo of a tabby cat",
    "astronaut": "a portrait of an astronaut with the American flag",
    "rocket": "a rocket standing on a launchpad",
    # "page": "a page of text about segmentation",
    # "motorcycle_right": "a red motorcycle standing in a garage",
    # "camera": "a person looking at a camera on a tripod",
    # "horse": "a black-and-white silhouette of a horse", 
    # "coffee": "a cup of coffee on a saucer"
    })

    clip_factory.prepare_images_and_classes("local_images", True, False) # or skimage.data_dir
    clip_factory.encode_image_tensors(np.stack(clip_factory.images_rgb)) 
    clip_factory.encode_text_classes(["This is " + desc for desc in clip_factory.classes])
    clip_factory.get_cosine_similarities()
    
    plot_cosines(len(clip_factory.descriptions), clip_factory.unprocessed_images, clip_factory.classes, clip_factory.similarity)
    return {"Hello": "World"}

@app.get("/set_zero_shot")
def read_root():
    """Classify as many images as you like. Optionally set the number of classes, or a list of nouns???"""

    clip_factory.prepare_images_and_classes("local_images", True, True) # or skimage.data_dir
    clip_factory.encode_image_tensors(np.stack(clip_factory.images_rgb)) 
    clip_factory.encode_text_classes(["This is " + desc for desc in clip_factory.classes])
    clip_factory.get_cosine_similarities()
    
    plot_zero_shot_images(clip_factory.similarity, clip_factory.classes)
    return {"Hello": "World"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: Optional[str] = None):
    return {"item_id": item_id, "q": q}