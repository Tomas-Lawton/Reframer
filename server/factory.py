import os
import matplotlib.pyplot as plt
from PIL import Image
import numpy as np

from collections import OrderedDict
import torch

from clip_util import enable_gpu, load_model_defaults, run_preprocess

class CLIP:
    """Init clip, then configure the classifier type, then set the required img/class/prompt parameters"""
    def __init__(self):
        self.start_clip()

    def start_clip(self):
        enable_gpu()
        model, preprocess = load_model_defaults()
        run_preprocess(preprocess)
        
        self.model = model
        self.preprocess = preprocess
        print("Model ready")
        return (model, preprocess)

    def set_image_descriptions(self, description_map):
        self.descriptions = dict(description_map)
        return self.descriptions

    def convert_local_images(self, image_dir_path):
        local_images = []
        rgb_images = []
        classes = []

        for filename in [filename for filename in os.listdir(image_dir_path) if filename.endswith(".png") or filename.endswith(".jpg")]:
            name = os.path.splitext(filename)[0]
            if name not in self.descriptions:
                continue #skip by restarting next for iteration

            image = Image.open(os.path.join(image_dir_path, filename)).convert("RGB")

            local_images.append(image)
            rgb_images.append(self.preprocess(image))
            classes.append(self.descriptions[name])

        self.set_local_images(local_images)
        self.set_processed_images(rgb_images)
        self.set_clip_classes(classes)

    def set_clip_classes(self, class_list):
        self.classes = class_list

    def set_local_images(self, local_images):
        self.local_images = local_images

    def set_processed_images(self, processed_images):
        self.images_rgb = processed_images # as tensors

    def encode_images(self):
        return

    def encode_text(self):
        return

    def create_image_classifier(self):
        return

    def create_text_classifier(self):
        return

#It is possible to chain results by feeding the output(s) of one encoder to the other or by looping.

class Image_Classifier:
    """Returns an image that best matches a prompt / Classifies image from prompt"""
    def __init__(self, mode):
        self.image_mode = mode # use argument to determine how image is created
        return

    def get_image_name_from_directory(self):
        return
    
    def get_similar_classes_from_image(self):
        return

    def get_similar_images_image(self):
        return

    def use_local_images(self):
        return

    def use_gan_image(self):
        return

    def use_bezier_curves(self):
        return

class Text_Classifier:
    """Returns the class(s) (+ full prompt?) that best matches an input image / Classifies text from image"""
    def __init__(self):
        return

    def get_class_from_input_image(self):
        return
    
    def get_similar_classes_from_image(self):
        return

    def get_similar_images_image(self):
        return