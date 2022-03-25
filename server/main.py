from email.mime import image
from typing import Optional
from fastapi import FastAPI
from factory import Clip_Factory
import skimage
import numpy as np
import logging
from plot_util import plot_cosines, plot_zero_shot_images, plot_image
from clip_util import get_noun_data

# add filename='logs.log'
logging.basicConfig(encoding='utf-8', level=logging.DEBUG, format=f'APP LOGGING: %(levelname)s %(name)s %(threadName)s : %(message)s')

app = FastAPI()
clip_factory = Clip_Factory()
clip_factory.start_clip_draw();

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/classify_dataset")
def classify_dataset():
    """Requires at least one image for each class so an image is classifed"""
    clip_factory.set_image_descriptions({
    "cat": "a facial photo of a tabby cat",
    "astronaut": "a portrait of an astronaut with the American flag",
    "rocket": "a rocket standing on a launchpad",
    # "page": "a page of text about segmentation",
    # "motorcycle_right": "a red motorcycle standing in a garage",
    # "camera": "a person looking at a camera on a tripod",
    # "horse": "a black-and-white silhouette of a horse", 
    # "coffee": "a cup of coffee on a saucer"
    })
    clip_factory.prepare_images("data/local_images", True, False) # or skimage.data_dir
    image_features = clip_factory.encode_image_tensors(np.stack(clip_factory.images_rgb)) 
    text_features = clip_factory.encode_text_classes(["This is " + desc for desc in clip_factory.classes])
    clip_factory.calc_cosine_similarities_for_text(text_features, image_features, False)
    plot_cosines(clip_factory)
    return {"Hello": "World"}

@app.get("/classify_zero_shot_dataset")
def classify_zero_shot_dataset():
    """Classify as many images as you like. Optionally set the number of classes, or a list of nouns???"""
    clip_factory.prepare_images("data/local_images", False, True) # or skimage.data_dir
    image_features = clip_factory.encode_image_tensors(np.stack(clip_factory.images_rgb)) 
    text_features = clip_factory.encode_text_classes(["This is " + desc for desc in clip_factory.classes])
    clip_factory.calc_cosine_similarities_for_text(text_features, image_features, True)
    plot_zero_shot_images(clip_factory)
    return {"Hello": "World"}

@app.get("/classify_zero_shot_image")
def read_item(target: str = "cat"):
    image_path = f"data/local_images/single_images/{target}.jpg"
    clip_factory.prepare_single_image(image_path) # or skimage.data_dir
    image_features = clip_factory.encode_image_tensors(np.stack(clip_factory.images_rgb)) 
    text_features = clip_factory.encode_text_classes(["This is " + desc for desc in clip_factory.classes])
    clip_factory.calc_cosine_similarities_for_text(text_features, image_features, True)
    plot_zero_shot_images(clip_factory)
    return {"Hello": target}

@app.get("/classify_text/directory/{prompt}")
def classify_text_from_image(prompt: str):
    prompt = prompt.replace('-', ' ')
    clip_factory.prepare_images(skimage.data_dir, False, False) # or skimage.data_dir
    text_features = clip_factory.encode_fixed_prompt(prompt)
    image_features = clip_factory.encode_image_tensors(np.stack(clip_factory.images_rgb)) 
    clip_factory.calc_cosine_similarities_for_image(text_features, image_features, True)
    
    image_values = clip_factory.similarity[0].tolist()
    top_index = np.argsort(image_values)[-1:][0]
    top_image = clip_factory.unprocessed_images[top_index]
    plot_image(top_image)
    return {"Hello": "{prompt}"}

@app.get("/activate_clip_draw/")
def classify_text_from_gan():
    # encode model
    prompt = ['A drawing of a red chair.']
    neg_prompts = ['A badly drawn sketch.', 'Many ugly, messy drawings.']
    nouns = get_noun_data()
    prompt_features = clip_factory.encode_text_classes(prompt)
    neg_prompt_features = clip_factory.encode_text_classes(neg_prompts)
    noun_features = clip_factory.encode_text_classes(nouns)


    return {"Hello": "World"}


# @app.get("/items/{item_id}")
# def read_item(item_id: int, q: Optional[str] = None):
#     return {"item_id": item_id, "q": q}