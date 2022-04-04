import numpy as np
import torch
import clip

import torch
from svgpathtools import svg2paths # add to package
from PIL import ImageColor

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
    logging.info("Preprocess complete")
    return

def get_noun_data():
    with open('data/noun_list.txt', 'r') as f:
        nouns = f.readline()
        f.close()
    nouns = nouns.split(" ")
    return ["a drawing of a " + x for x in nouns]
    # return ["a drawing of a " + x for x in nouns[0::100]]

def get_drawing_paths(path_to_svg_file, use_user_paths):
    path_list = []
    paths, attributes = svg2paths(path_to_svg_file)
    for att in attributes:
        # defaults
        color = [0, 0, 0, 1]
        stroke_width = 15
        color_code = '#000000'
        opacity = 1
        # parse values
        if use_user_paths:
            try:
                if 'stroke' in att:
                    color_code = str(att['stroke'])
                if 'stroke-opacity' in att:
                    opacity = float(att['stroke-opacity'])
                if 'stroke-width' in att:
                    stroke_width = float(att['stroke-width'])
            except:
                logging.error("Couldn't parse sketch")
        if not use_user_paths:
            style = att['style'].split(';')
            for x in style:
                # logging.info(x) # view available styles
                if len(x) >= 13:
                    if x[:13] == 'stroke-width:':
                        stroke_width = float(x[13:])
                if len(x) >= 15:
                    if x[:15] == 'stroke-opacity:':
                        opacity = float(x[15:])
                if len(x) >= 8:
                    if x[:7] == 'stroke:':
                        color_code = str(x[7:])
        rgb = ImageColor.getrgb(color_code)
        for i, val in enumerate(rgb):
            color[i] = float(val/256)
        color[3] = opacity

        num_segments = len(att['d'].split(','))//3
        path = []
        # dynamically set canvas size for session. ??
        if not use_user_paths:
            # print(att['d'].split('c'))
            [x_a, x_b] = att['d'].split('c')
            x0 = [float(x) for x in x_a[2:].split(',')]
            points = [xx.split(',') for xx in x_b[1:].split(' ')]
            points = [[float(x), float(y)] for [x,y] in points] 
            path = [x0]+points
        if use_user_paths:
            spaced_data = att['d'].split('c')
            x0 = spaced_data[0][2:].split(',') # only thing different is M instead of m
            curve_list = [spaced_data.split(' ') for spaced_data in spaced_data[1:]] # exclude move to
            point_list = []
            for curve in curve_list:
                for i in range(3):
                    point_list.append(curve[i])
            tuple_array = [tuple.split(',') for tuple in point_list] # split each curve by path spaces, then comma for points
            points_array = [[float(x), float(y)] for [x,y] in tuple_array] 
            path = [x0]+points_array
            path = points_array
        
        path = torch.tensor(path)
        color = torch.tensor(color)
        stroke_width = torch.tensor(stroke_width)
        v0 = torch.tensor([0,0])
        for k in range(path.size(0)):
            path[k,:] += v0
            if k%3 == 0:
                v0 = path[k,:]
        path_list.append(DrawingPath(path, color, stroke_width, num_segments))
    logging.info(f"Returning list of paths: \n {path_list}")    
    return path_list


def save_data(time_str, draw_class):
    with open('results/'+time_str+'.txt', 'w') as f:
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

