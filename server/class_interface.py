import os
from PIL import Image
import clip
import torch

from clip_util import load_model_defaults, run_preprocess, get_noun_data
from clip_draw import Clip_Draw_Optimiser

import logging


class Clip_Class:
    """Init clip, then configure the classifier type, then set the required img/class/prompt parameters"""

    __instance = None

    def __init__(self):
        if (
            Clip_Class.__instance != None
        ):  # Should this all be refactored to not be a "class instance" since it is only used once?
            raise Exception("Clip is already instantiated.")

        device, model, preprocess = load_model_defaults()
        self.device = device
        self.model = model
        self.preprocess = preprocess

        run_preprocess(preprocess)
        logging.info("Model ready")
        Clip_Class.__instance == self

    def set_image_descriptions(self, description_map):
        """Ensure every description has an image whose name matches the description list"""
        self.descriptions = dict(description_map)
        return self.descriptions

    def set_clip_classes(self, class_list):
        self.classes = class_list

    def set_unprocessed_images(self, unprocessed_images):
        self.unprocessed_images = unprocessed_images

    def set_processed_images(self, processed_images):
        self.images_rgb = processed_images  # as tensors

    def prepare_single_image(self, image_path):
        """Zero shot always uses all classes"""
        self.set_clip_classes(get_noun_data())
        image = Image.open(image_path).convert("RGB")
        self.set_unprocessed_images([image])
        self.set_processed_images([self.preprocess(image)])

    def prepare_images(
        self, image_dir_path, use_descriptions=True, use_all_classes=False
    ):
        """Defaults to data-set classification mode and only using classes corresponding to a single image
        Zero_shot is activated by not using descriptions. use_all_classes should be set to true for zero_shot but not text classification where class is fixed."""
        unprocessed_images = []
        rgb_images = []
        classes = []
        for filename in [
            filename
            for filename in os.listdir(image_dir_path)
            if filename.endswith(".png") or filename.endswith(".jpg")
        ]:
            if use_descriptions and not use_all_classes:
                name = os.path.splitext(filename)[0]
                if name not in self.descriptions:
                    continue  # skip by starting for loop iteration
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
                self.set_clip_classes(get_noun_data())

    def encode_image_tensors(self, img_tensor):
        image_input = torch.tensor(img_tensor)
        with torch.no_grad():
            image_features = (
                self.model.encode_image(image_input).float().cpu()
            )  # normalise add to device
            return image_features / image_features.norm(dim=-1, keepdim=True)

    def encode_text_classes(self, token_list):
        tokens = []
        if token_list != []:
            try:
                tokens = clip.tokenize(token_list)
            except:
                logging.error(f"Failed to tokenize: {token_list}")
        if tokens == []:
            return tokens

        with torch.no_grad():
            text_features = self.model.encode_text(tokens).float().cpu()  # normalise
            return text_features / text_features.norm(dim=-1, keepdim=True)

    def calc_cosine_similarities_for_text(
        self, text_features, image_features, apply_scaleing=False
    ):
        """Calculates the cosines for caption with every image (square of cosines)"""
        if apply_scaleing:
            self.similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)
        else:
            self.similarity = (
                image_features.cpu().numpy() @ text_features.cpu().numpy().T
            )

    # how to refactor this? !!!UBIU!BGIOUBG:POUBG
    def calc_cosine_similarities_for_image(
        self, text_features, image_features, apply_scaleing=False
    ):  # how to do this without flipping???
        """Calculates the cosines for every image with every caption (square of cosines)"""
        if apply_scaleing:
            self.similarity = (100.0 * text_features @ image_features.T).softmax(dim=-1)
        else:
            self.similarity = (
                text_features.cpu().numpy() @ image_features.cpu().numpy().T
            )

    def create_clip_draw(self, encode_nouns):
        noun_features = []
        if encode_nouns:
            logging.info("Encoding nouns")
            nouns = get_noun_data()
            noun_features = self.encode_text_classes(nouns)
        self.clip_draw_optimiser = Clip_Draw_Optimiser(self.model, noun_features)

    def start_clip_draw(self, prompts, region, neg_prompts=[]):
        """Check if it's running and if it is, wait for it to stop before starting again."""
        self.clip_draw_optimiser.reset()

        logging.info("Starting clip drawer")
        prompt_features = self.encode_text_classes(prompts)
        neg_prompt_features = self.encode_text_classes(neg_prompts)
        try:
            self.clip_draw_optimiser.set_text_features(
                prompt_features, neg_prompt_features
            )
        except:
            logging.error("Failed to encode text features in clip")
        try:
            self.clip_draw_optimiser.parse_svg(region)
        except:
            logging.error("Couldn't parse data from sketch")
        try:
            return self.clip_draw_optimiser.activate()
        except:
            logging.error("Failed to activate clip draw")

    def restart_last_drawer(self):
        """Use old classes to guide image"""
        self.clip_draw_optimiser.activate()


# TO DO
# It is possible to chain results by feeding the output(s) of one encoder to the other or by looping.
# MAKE SURE CLIP IS SET TO ZERO SHOT
class Image_Classifier:
    """Returns an image that best matches a prompt / Classifies image from prompt"""

    def __init__(self, mode):
        self.image_mode = mode  # use argument to determine how image is created
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
