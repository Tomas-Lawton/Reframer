import torch
import numpy as np
import imageio

def scale_points(points, normaliseScaleFactor):
    return {
        'x0': float(points['x0']) * normaliseScaleFactor,
        'x1': float(points['x1']) * normaliseScaleFactor,
        'y0': float(points['y0']) * normaliseScaleFactor,
        'y1': float(points['y1']) * normaliseScaleFactor,
    }

def save_data(save_path, name, params):
    with open(save_path + name + '.txt', 'w') as f:
        f.write('I0: ' + params.svg_path + '\n')
        f.write('prompt: ' + str(params.clip_prompt) + '\n')
        f.write('num paths: ' + str(params.num_paths) + '\n')
        f.write('num_iter: ' + str(params.num_iter) + '\n')
        f.write('w_points: ' + str(params.w_points) + '\n')
        f.write('w_colors: ' + str(params.w_colors) + '\n')
        f.write('w_widths: ' + str(params.w_widths) + '\n')
        f.write('w_img: ' + str(params.w_img) + '\n')
        f.close()


logList = [
    [0.0001, 0.0001, 0.0001],
    [0.00032, 0.0032, 0.00032],
    [0.001, 0.01, 0.001],
    [0.1, 1, 0.1],
    [1, 1, 1],
]


def use_penalisation(i):
    (a, b, c) = logList[i]
    return a, b, c


def area_mask(width, height, drawing_area):
    print(drawing_area)
    j0 = round(drawing_area['x0'] * width)
    j1 = round(drawing_area['x1'] * width)
    i1 = round((drawing_area['y1']) * height)
    i0 = round((drawing_area['y0']) * height)
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


class GifBuilder:
    def __init__(self):
        self.images = []

    def add(self, img):
        self.images.append((1080 * img).detach().type(torch.ByteTensor))

    def build_gif(self, path):
        imageio.mimsave(f'{path}_movie.gif', self.images, format="GIF", duration=10)


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


def k_min_elements(X, K):
    return np.argsort(X)[:K]


def k_max_elements(X, K):
    return np.argsort(X)[K:]
