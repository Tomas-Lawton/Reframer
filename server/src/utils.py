import torch
import numpy as np
import imageio
from torchvision import transforms
from src.svg_extraction import DrawingPath

# color_palette = ['#0062A7', '#324513','#DBA869', '#6E9BCE', '#008C94']
color_palette = [
    'RGB(11,56,113)',
    'RGB(36,145,78)',
    'RGB(161,143,10)',
    'RGB(231,138,66)',
    'RGB(116,47,50)',
]


def save_data(save_path, name, params):
    with open(save_path + name + '.txt', 'w') as f:
        f.write('I0: ' + params.svg_path + '\n')
        f.write('prompt: ' + str(params.prompt) + '\n')
        f.write('num paths: ' + str(params.num_paths) + '\n')
        f.write('num_iter: ' + str(params.num_iter) + '\n')
        f.write('w_points: ' + str(params.w_points) + '\n')
        f.write('w_colors: ' + str(params.w_colors) + '\n')
        f.write('w_widths: ' + str(params.w_widths) + '\n')
        f.write('w_img: ' + str(params.w_img) + '\n')
        f.close()


def area_mask(width, height, drawing_area):
    j0 = round(drawing_area['x0'] * width)
    j1 = round(drawing_area['x1'] * width)
    i0 = round((1 - drawing_area['y1']) * height)
    i1 = round((1 - drawing_area['y0']) * height)
    mask = torch.ones((height, width, 3))
    mask[i0:i1, j0:j1, :] = torch.zeros((i1 - i0, j1 - j0, 3))
    mask = mask[:, :, :3].unsqueeze(0).permute(0, 3, 1, 2)
    return mask


def get_nouns():
    with open('data/nouns.txt', 'r') as f:
        nouns = f.readline()
        f.close()
    nouns = nouns.split(" ")
    noun_prompts = ["a drawing of a " + x for x in nouns]
    return nouns, noun_prompts


# Print iterations progress
def printProgressBar(
    iteration,
    total,
    loss,
    prefix='Progress',
    suffix='-- Loss: ',
    decimals=1,
    length=50,
    fill='█',
    printEnd="\r",
):
    """
    Call in a loop to create terminal progress bar
    @params:
        iteration   - Required  : current iteration (Int)
        total       - Required  : total iterations (Int)
        prefix      - Optional  : prefix string (Str)
        suffix      - Optional  : suffix string (Str)
        decimals    - Optional  : positive number of decimals in percent complete (Int)
        length      - Optional  : character length of bar (Int)
        fill        - Optional  : bar fill character (Str)
        printEnd    - Optional  : end character (e.g. "\r", "\r\n") (Str)
    """
    percent = ("{0:." + str(decimals) + "f}").format(100 * (iteration / float(total)))
    loss = "{:3f}".format(loss)
    filledLength = int(length * iteration // total)
    bar = fill * filledLength + '-' * (length - filledLength)
    print(f'\r{prefix} |{bar}| {percent}% {suffix} {loss}', end=printEnd)
    # Print New Line on Complete
    if iteration == total:
        print()


def k_max_elements(X, K):
    return np.argsort(X)[len(X) - K :]


def k_min_elements(X, K):
    return np.argsort(X)[:K]


class GifBuilder:
    def __init__(self):
        self.images = []

    def add(self, img):
        self.images.append((255 * img).detach().type(torch.ByteTensor))

    def build_gif(self, path):
        imageio.mimsave(f'{path}_movie.gif', self.images, format="GIF", duration=0.03)


def get_prompt_loss(img_features, text_features, args):
    loss = 0
    for n in range(args.num_augs):
        loss -= torch.cosine_similarity(text_features, img_features[n : n + 1], dim=1)
    return loss


def shapes2paths(shapes, shape_groups, tie, args):
    path_list = []
    for k in range(len(shapes)):
        path = shapes[k].points / torch.tensor([args.canvas_w, args.canvas_h])
        num_segments = len(path) // 3
        width = shapes[k].stroke_width / 100
        color = shape_groups[k].stroke_color
        path_list.append(DrawingPath(path, color, width, num_segments, tie))
    return path_list


def tie(S, K=None):
    eigvals, _ = np.linalg.eigh(S)
    if not K:
        eigvals = [x for x in eigvals if x > 0.01]
        K = len(eigvals)
    else:
        eigvals = eigvals[:K]

    entropy = K * (np.log(2 * np.pi) + 1)
    for eig in eigvals:
        if eig < 0.01:
            raise ValueError("Eigenvalue is too small")
        entropy += np.log(eig)
    entropy *= 0.5

    return entropy


def get_augment_trans(canvas_width, normalize_clip=False):
    if normalize_clip:
        augment_trans = transforms.Compose(
            [
                transforms.RandomPerspective(fill=1, p=1, distortion_scale=0.5),
                transforms.RandomResizedCrop(canvas_width, scale=(0.7, 0.9)),
                transforms.Normalize(
                    (0.48145466, 0.4578275, 0.40821073),
                    (0.26862954, 0.26130258, 0.27577711),
                ),
            ]
        )
    else:
        augment_trans = transforms.Compose(
            [
                transforms.RandomPerspective(fill=1, p=1, distortion_scale=0.5),
                transforms.RandomResizedCrop(canvas_width, scale=(0.7, 0.9)),
            ]
        )

    return augment_trans
