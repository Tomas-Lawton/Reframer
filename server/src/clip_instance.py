import clip
import torch
import logging

class Clip_Instance:
    def __init__(self):
        tv = torch.__version__.split(".")
        tv = 10000 * int(tv[0]) + 100 * int(tv[1]) + int(tv[2])
        assert tv >= 10701, "PyTorch 1.7.1 or later is required"
        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        self.model, self.preprocess = clip.load('ViT-B/32', self.device, jit=False)
        self.preprocess
        logging.info("Model ready")

    def encode_text_classes(self, token_list):
        if token_list == []:
            return token_list
        tokens = clip.tokenize(token_list).to(self.device)
        with torch.no_grad():
            features = self.model.encode_text(tokens)  # normalise
            return features / features.norm(dim=-1, keepdim=True)
