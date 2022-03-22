import os
from PIL import Image
import numpy as np
import clip
from collections import OrderedDict
import torch

from clip_util import load_model_defaults, run_preprocess
from noun_list import lots_of_classes

import logging
class CLIP:
    """Init clip, then configure the classifier type, then set the required img/class/prompt parameters"""

    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        model, preprocess = load_model_defaults()
        run_preprocess(preprocess)
        self.model = model
        self.preprocess = preprocess
        logging.info("Model ready")

    def set_image_descriptions(self, description_map):
        """Ensure every description has an image whose name matches the description list"""
        self.descriptions = dict(description_map)
        return self.descriptions

    def set_clip_classes(self, class_list):
        self.classes = class_list

    def set_unprocessed_images(self, unprocessed_images):
        self.unprocessed_images = unprocessed_images

    def set_processed_images(self, processed_images):
        self.images_rgb = processed_images # as tensors

    def prepare_single_image(self, image_path):
        """Zero shot always uses all classes"""
        self.set_clip_classes(lots_of_classes())
        image = Image.open(image_path).convert("RGB")
        self.set_unprocessed_images([image])
        self.set_processed_images([self.preprocess(image)])

    def prepare_images(self, image_dir_path, use_descriptions=True, use_all_classes=False):
        """Defaults to data-set classification mode and only using classes corresponding to a single image
        Zero_shot is activated by not using descriptions. use_all_classes should be set to true for zero_shot but not text classification where class is fixed."""
        unprocessed_images = []
        rgb_images = []
        classes = []
        for filename in [filename for filename in os.listdir(image_dir_path) if filename.endswith(".png") or filename.endswith(".jpg")]:
            if use_descriptions and not use_all_classes:
                name = os.path.splitext(filename)[0]
                if name not in self.descriptions:
                    continue #skip by starting for loop iteration
                classes.append(self.descriptions[name])
            image = Image.open(os.path.join(image_dir_path, filename)).convert("RGB")
            unprocessed_images.append(image)
            rgb_images.append(self.preprocess(image))

        self.set_unprocessed_images(unprocessed_images)
        self.set_processed_images(rgb_images)
        # todo: refactor
        if use_descriptions:
            if use_all_classes:
                self.set_clip_classes(list(self.descriptions.values())) 
            else:
                self.set_clip_classes(classes)
        else:
            if use_all_classes:
                self.set_clip_classes(lots_of_classes())

    def encode_image_tensors(self, img_tensor):
        image_input = torch.tensor(img_tensor)
        with torch.no_grad():
            image_features = self.model.encode_image(image_input).float().cpu() #normalise add to device
        self.image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        return self.image_features

    def encode_text_classes(self, token_list):
        text_tokens = clip.tokenize(token_list)
        with torch.no_grad():
            text_features = self.model.encode_text(text_tokens).float().cpu() #normalise
        self.text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        return self.text_features

    def encode_fixed_prompt(self, prompt):
        return self.encode_text_classes([prompt])

    def calc_cosine_similarities(self, apply_scaleing=False):
        """Calculates the cosines for every image with every caption (square of cosines)"""
        if apply_scaleing:
            self.similarity = (100.0 * self.image_features @ self.text_features.T).softmax(dim=-1)
        else:
            self.similarity = self.text_features.cpu().numpy() @ self.image_features.cpu().numpy().T

# def calc_cosine_similarities(self, apply_scaleing):
#         """Calculates the cosines for every image with every caption (square of cosines)"""
#         # self.similarity = self.text_features.cpu().numpy() @ self.image_features.cpu().numpy().T
#         if apply_scaleing:
#             self.similarity = (100.0 * self.image_features @ self.text_features.T).softmax(dim=-1)
#         else: 
#             self.similarity = self.image_features @ self.text_features.T

    # def classify_image_zero_shot(self):
    #     self.calc_cosine_similarities(False)
    #     text_probs = (100.0 * self.image_features @ self.text_features.T).softmax(dim=-1) # how to substitute above into this line???
    #     top_probs, top_labels = text_probs.cpu().topk(5, dim=-1)
    #     return top_probs, top_labels

# # # # # # Text classifier
    def predict_directory_image_from_prompt(self, image_dir_path):
        # set image mode
        # get the images with prepare_images with descriptions set to false, 
        # process the images
        # encode the text and the image
        # find the most similar image to given prompt
        # using the locally processed images.
        return

    def classify_text_with_local_image(self):
        self.calc_cosine_similarities()
        with torch.no_grad():
            similarity = (100.0 * self.text_features @ self.image_features.T).softmax(dim=-1) # switch terms gives the images
            logging.warning(similarity)
            values, indices = similarity[0].topk(1) # use similarity 1 for image and pick the best
            logging.info(values)
            logging.info(indices)

            logging.info("\nTop predictions:\n")
            for value, index in zip(values, indices):
                logging.info(f"Image {index}: {100 * value.item():.2f}%")
        return 

    def gan_image_from_prompt(self):
        return

    def bezier_image_from_prompt(self):
        return

    def create_text_classifier(self, mode):
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

    def use_unprocessed_images(self):
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