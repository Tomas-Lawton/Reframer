import torch
import clip
from src.processing import get_augment_trans


class TextBehaviour:
    def __init__(self, im_width=224, normalize_clip=True):
        self.device = "cuda:0" if torch.cuda.is_available() else "cpu"
        self.model, preprocess = clip.load('ViT-B/32', self.device, jit=False)
        self.augment_trans = get_augment_trans(im_width, normalize_clip)
        self.behaviours = []

    @torch.no_grad()
    def add_behaviour(self, word_0, word_1):
        z_0 = self.model.encode_text(clip.tokenize(word_0).to(self.device))
        z_1 = self.model.encode_text(clip.tokenize(word_1).to(self.device))
        self.behaviours.append(
            {"name": f"{word_0} vs {word_1}", "z_0": z_0, "z_1": z_1}
        )

    @torch.no_grad()
    def eval_behaviours(self, img, showme=False, num_augs=4):
        if img.shape[2] == 3:
            img = img.unsqueeze(0).permute(0, 3, 1, 2).to(self.device)

        im_batch = [self.augment_trans(img) for n in range(num_augs)]
        im_batch = torch.cat(im_batch)
        img_features = self.model.encode_image(im_batch)

        beh_scores = []
        for behaviour in self.behaviours:
            score = 0
            for n in range(num_augs):
                score += torch.cosine_similarity(
                    behaviour["z_0"], img_features[n : n + 1], dim=1
                )
                score -= torch.cosine_similarity(
                    behaviour["z_1"], img_features[n : n + 1], dim=1
                )
            beh_scores.append(score)
            if showme:
                print(f"{behaviour['name']} score: {score.item()}")

        return torch.tensor(beh_scores)
