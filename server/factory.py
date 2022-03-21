import os
from io import BytesIO
import matplotlib
matplotlib.use('agg') # non interactive with fast api

from matplotlib import pyplot as plt
from PIL import Image
import numpy as np
import clip
from collections import OrderedDict
import torch

from clip_util import enable_gpu, load_model_defaults, run_preprocess
from noun_list import lots_of_classes
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
            if name not in self.descriptions: # how to use without name?
                continue #skip by restarting next for iteration

            image = Image.open(os.path.join(image_dir_path, filename)).convert("RGB")

            local_images.append(image)
            rgb_images.append(self.preprocess(image))
            classes.append(self.descriptions[name])

        self.set_local_images(local_images)
        self.set_processed_images(rgb_images)
        self.set_clip_classes(classes) # set of descriptions

    def set_clip_classes(self, class_list):
        self.classes = class_list

    def set_local_images(self, local_images):
        self.local_images = local_images

    def set_processed_images(self, processed_images):
        self.images_rgb = processed_images # as tensors

    def encode_images_from_local(self, img_tensor):
        image_input = torch.tensor(img_tensor)
        with torch.no_grad():
            image_features = self.model.encode_image(image_input).float().cpu()
        #normalise
        self.image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        return self.image_features

    def encode_text_classes(self, token_list):
        text_tokens = clip.tokenize(token_list)
        with torch.no_grad():
            text_features = self.model.encode_text(text_tokens).float().cpu()
        #normalise
        self.text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        return self.text_features

    def get_cosine_simalarity(self, text_features, image_features):
        return text_features.cpu().numpy() @ image_features.cpu().numpy().T

    def plot_test(self, similarity):
        count = len(self.descriptions)
        plt.figure(figsize=(20, 14))
        plt.imshow(similarity, vmin=0.1, vmax=0.3)
        # plt.colorbar()
        plt.yticks(range(count), self.classes, fontsize=18)
        plt.xticks([])
        for i, image in enumerate(self.local_images):
            plt.imshow(image, extent=(i - 0.5, i + 0.5, -1.6, -0.6), origin="lower")
        for x in range(similarity.shape[1]):
            for y in range(similarity.shape[0]):
                plt.text(x, y, f"{similarity[y, x]:.2f}", ha="center", va="center", size=12)

        for side in ["left", "top", "right", "bottom"]:
            plt.gca().spines[side].set_visible(False)

        plt.xlim([-0.5, count - 0.5])
        plt.ylim([count + 0.5, -2])

        plt.title("Cosine similarity between text and image features", size=20)
        plt.savefig('my_plot.png')

    def create_zero_shot_image_classifier(self):
        classes = lots_of_classes()
        self.encode_text_classes(classes)
        text_probs = (100.0 * self.image_features @ self.text_features.T).softmax(dim=-1)
        top_probs, top_labels = text_probs.cpu().topk(5, dim=-1)
        plt.figure(figsize=(16, 16))

        for i, image in enumerate(self.local_images):
            plt.subplot(4, 4, 2 * i + 1)
            plt.imshow(image)
            plt.axis("off")

            plt.subplot(4, 4, 2 * i + 2)
            y = np.arange(top_probs.shape[-1])
            plt.grid()
            plt.barh(y, top_probs[i])
            plt.gca().invert_yaxis()
            plt.gca().set_axisbelow(True)
            plt.yticks(y, [classes[index] for index in top_labels[i].numpy()])
            plt.xlabel("probability")

        plt.subplots_adjust(wspace=0.5)
        plt.savefig('zero-shot-classify.png')

    # def create_image_classifier(self, similarity):
    #     values, indices = similarity[0].topk(5)
    #     return (values, indices)

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