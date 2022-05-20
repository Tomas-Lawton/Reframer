import torch
import clip
from svgpathtools import svg2paths
from svgelements import *
from PIL import ImageColor
import logging
import numpy as np

class DrawingPath:
    def __init__(self, path, color, width, num_segments):
        self.path = path
        self.color = color
        self.width = width
        self.num_segments = num_segments


def load_model_defaults():
    logging.info(f"Torch version: {torch.__version__}")
    assert torch.__version__.split(".") >= [
        "1",
        "7",
        "1",
    ], "PyTorch 1.7.1 or later is required"

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    logging.info(f"These clip models are available: \n{clip.available_models()}")
    model, preprocess = clip.load('ViT-B/32', device, jit=False)
    input_resolution = model.visual.input_resolution
    context_length = model.context_length
    vocab_size = model.vocab_size

    logging.info(
        f"Model parameters: {np.sum([int(np.prod(p.shape)) for p in model.parameters()]):,}"
    )
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


def get_color(code, opacity):
    color = [0, 0, 0, 1]
    rgb = ImageColor.getrgb(code)
    for i, val in enumerate(rgb):
        color[i] = float(val / 256)
    color[3] = opacity
    return color


def data_to_tensor(color, stroke_width, path, num_segments):
    color = torch.tensor(color)
    stroke_width = torch.tensor(stroke_width)
    v0 = torch.tensor([0, 0])
    path = torch.tensor(path)
    for k in range(path.size(0)):
        path[k, :] += v0
        if k % 3 == 0:
            v0 = path[k, :]
    return DrawingPath(path, color, stroke_width, num_segments)


def parse_local_svg(path_to_svg_file):
    paths, attributes = svg2paths(path_to_svg_file)
    path_list = []
    for att in attributes:
        stroke_width = 15
        color_code = '#000000'
        opacity = 1
        style = att['style'].split(';')
        for x in style:
            if len(x) >= 13:
                if x[:13] == 'stroke-width:':
                    stroke_width = float(x[13:])
            if len(x) >= 15:
                if x[:15] == 'stroke-opacity:':
                    opacity = float(x[15:])
            if len(x) >= 8:
                if x[:7] == 'stroke:':
                    color_code = str(x[7:])

        color = get_color(color_code, opacity)
        num_segments = len(att['d'].split(',')) // 3

        path = []
        [x_a, x_b] = att['d'].split('c')
        x0 = [float(x) for x in x_a[2:].split(',')]
        points = [xx.split(',') for xx in x_b[1:].split(' ')]
        points = [[float(x), float(y)] for [x, y] in points]
        path = [x0] + points

        path_list.append(data_to_tensor(color, stroke_width, path, num_segments))

    logging.info(f"Returning list of paths: \n {path_list}")
    return path_list


def parse_svg(path_to_svg_file, skip_box_select=False):
    try:
        paths, attributes = svg2paths(path_to_svg_file)
        path_list = []
        parsed_svg = SVG.parse(path_to_svg_file)  # access <g> tag for non-path styles
        elements_list = list(parsed_svg.elements())
    except:
        logging.error("Couldn't read svg file")
    path_group = {}
    parent_svg = {}

    for element in elements_list:
        try:
            if element.values['tag'] == 'g':
                path_group = element.values
                continue
        except (KeyError, AttributeError):
            pass
        try:
            if element.values['tag'] == 'svg':
                parent_svg = element.values
                continue
        except (KeyError, AttributeError):
            pass

    try:
        print(parent_svg['attributes'])
        width = float(parent_svg['attributes']['width'])
        height = float(parent_svg['attributes']['height'])
        frame_size = max(width, height)
        normaliseScaleFactor = 1 / frame_size
        resizeScaleFactor = 224 / frame_size
    except:
        logging.error("Couldn't parse SVG Parent")

    count = 0
    num_paths = len(attributes)
    for att in attributes:
        if skip_box_select and count == num_paths - 1:
            continue
        # could refactor now local file is seperate function
        stroke_width = 15
        color_code = '#000000'
        opacity = 1
        try:
            if 'stroke' in att:
                color_code = str(att['stroke'])
            else:
                color_code = str(path_group['attributes']['stroke'])
        except:
            logging.error("Couldn't parse stroke")

        try:
            if 'stroke-width' in att:
                stroke_width = float(att['stroke-width']) * normaliseScaleFactor
            else:
                stroke_width = (
                    float(path_group['attributes']['stroke-width'])
                    * normaliseScaleFactor
                )
        except:
            logging.error("Couldn't parse stroke width")
            # if 'stroke-opacity' in att:
                # opacity = float(att['stroke-opacity'])

        try:
            if 'opacity' in att:
                opacity = float(att['opacity'])
            else:
                opacity = str(path_group['attributes']['opacity'])
        except:
            logging.error("Couldn't parse stroke opacity")

        color = get_color(color_code, opacity)
        num_segments = len(att['d'].split(',')) // 3

        try:
            path = []
            spaced_data = att['d'].split('c')
            x0 = spaced_data[0][1:].split(',')  # only thing different is M instead of m
            curve_list = [
                spaced_data.split(' ') for spaced_data in spaced_data[1:]
            ]  # exclude move to
            point_list = []
            for curve in curve_list:
                for i in range(3):
                    point_list.append(curve[i])
            tuple_array = [
                tuple.split(',') for tuple in point_list
            ]  # split each curve by path spaces, then comma for points
            points_array = [
                [
                    round(float(x) * normaliseScaleFactor, 5),
                    round(float(y) * normaliseScaleFactor, 5),
                ]
                for [x, y] in tuple_array
            ]
            start_x = round(float(x0[0]) / width, 5)
            start_y = round(float(x0[1]) / height, 5)
            x0 = [start_x, start_y]
            path = [x0] + points_array
            path_list.append(data_to_tensor(color, stroke_width, path, num_segments))
        except:
            logging.error("Unexpected paths in canvas")
        count += 1

    logging.info(f"Returning list of paths: \n {path_list}")
    return path_list, width, height, resizeScaleFactor, normaliseScaleFactor


def save_data(time_str, draw_class):
    with open('results/' + time_str + '.txt', 'w') as f:
        f.write('prompt: ' + str(draw_class.clip_prompt) + '\n')
        f.write('num paths: ' + str(draw_class.num_paths) + '\n')
        f.write('num_iter: ' + str(draw_class.num_iter) + '\n')
        f.write('w_points: ' + str(draw_class.w_points) + '\n')
        f.write('w_colors: ' + str(draw_class.w_colors) + '\n')
        f.write('w_widths: ' + str(draw_class.w_widths) + '\n')
        f.write('w_img: ' + str(draw_class.w_img) + '\n')
        f.close()


def area_mask(width, height, x0=0, x1=1, y0=0, y1=1):
    j0 = round(x0 * width)
    j1 = round(x1 * width)
    i0 = round((1 - y1) * height)
    i1 = round((1 - y0) * height)
    mask = torch.ones((height, width, 3))
    mask[i0:i1, j0:j1, :] = torch.zeros((i1 - i0, j1 - j0, 3))
    return mask
