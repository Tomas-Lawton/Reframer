import numpy as np
import torch
import clip

import torch
from svgpathtools import svg2paths # add to package

import logging

class DrawingPath():
    def __init__(self, path, color, width, num_segments):
        self.path = path
        self.color = color
        self.width = width
        self.num_segments = num_segments

def load_model_defaults():
    logging.info(f"Torch version: {torch.__version__}")
    assert torch.__version__.split(".") >= ["1", "7", "1"], "PyTorch 1.7.1 or later is required"

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    logging.info(f"These clip models are available: \n{clip.available_models()}")
    model, preprocess = clip.load('ViT-B/32', device, jit=False)
    input_resolution = model.visual.input_resolution
    context_length = model.context_length
    vocab_size = model.vocab_size

    logging.info(f"Model parameters: {np.sum([int(np.prod(p.shape)) for p in model.parameters()]):,}")
    logging.info(f"Input resolution: {input_resolution}")
    logging.info(f"Context length: {context_length}")
    logging.info(f"Vocab size: {vocab_size}")
    return device, model, preprocess

def run_preprocess(preprocess):
    preprocess
    print("Preprocess complete")
    return

def get_noun_data():
    with open('data/nouns.txt', 'r') as f:
        nouns = f.readline()
        f.close()
    nouns = nouns.split(" ")
    return ["a drawing of a " + x for x in nouns]


def get_drawing_paths(path_to_svg_file):
    path_list = []
    paths, attributes = svg2paths(path_to_svg_file)
    
    for att in attributes:
        style = att['style'].split(';')
        for x in style:
            if len(x) >= 13:
                if x[:13] == 'stroke-width:':
                    width = float(x[13:])
            if len(x) >= 15:
                if x[:15] == 'stroke-opacity:':
                    opacity = float(x[15:])
            if len(x) >= 8:
                if x[:8] == 'stroke:#':
                    hex_code = x[8:]
                    color = list(int(hex_code[i:i+2], 16)/255 for i in (0, 2, 4))
        color.append(opacity)
        color = torch.tensor(color)
        width = torch.tensor(width)

        try:
            [x_a, x_b] = att['d'].split('c')
        except:
            [x_a, x_b] = att['d'].split('C')
        x0 = [float(x) for x in x_a[2:].split(',')]
        points = [xx.split(',') for xx in x_b[1:].split(' ')]
        points = [[float(x), float(y)] for [x,y] in points] 
        path = [x0]+points
        num_segments = len(path)//3
        path = torch.tensor(path)
        v0 = torch.tensor([0,0])
        for k in range(path.size(0)):
            path[k,:] += v0
            if k%3 == 0:
                v0 = path[k,:]

    
        path_list.append(DrawingPath(path, color, width, num_segments))
    # print(path, color, width, num_segments)    
    return path_list

def save_data(time_str, draw_class):
    with open('results/'+time_str+'.txt', 'w') as f:
        f.write('I0: ' +draw_class.svg_path +'\n')
        f.write('prompt: ' +str(draw_class.clip_prompt) +'\n')
        f.write('num paths: ' +str(draw_class.num_paths) +'\n')
        f.write('num_iter: ' +str(draw_class.num_iter) +'\n')
        f.write('w_points: '+str(draw_class.w_points)+'\n')
        f.write('w_colors: '+str(draw_class.w_colors)+'\n')
        f.write('w_widths: '+str(draw_class.w_widths)+'\n')
        f.write('w_img: '+str(draw_class.w_img)+'\n')
        f.close()


def area_mask(width, height, x0=0, x1=1, y0=0, y1=1):
    j0 = round(x0*width)
    j1 = round(x1*width)
    i0 = round((1-y1)*height)
    i1 = round((1-y0)*height)
    mask = torch.ones((height, width,3))
    mask[i0:i1, j0:j1, :] = torch.zeros((i1-i0, j1-j0, 3))
    return mask

