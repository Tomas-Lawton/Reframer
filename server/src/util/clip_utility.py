import torch
import clip
from svgpathtools import svg2paths
from svgelements import *
from PIL import ImageColor
import logging


class DrawingPath:
    def __init__(self, path, color, width, num_segments, is_tied):
        self.path = path
        self.color = color
        self.width = width
        self.num_segments = num_segments
        self.is_tied = is_tied


def shapes2paths(shapes, shape_groups, tie):
    path_list = []
    for k in range(len(shapes)):
        path = shapes[k].points / torch.tensor([224, 224])
        num_segments = len(path) // 3
        width = shapes[k].stroke_width / 100
        color = shape_groups[k].stroke_color
        path_list.append(DrawingPath(path, color, width, num_segments, tie))
    return path_list


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
    return DrawingPath(path, color, stroke_width, num_segments, True)


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


def parse_svg(path_to_svg_file, with_selection):
    try:
        paths, attributes = svg2paths(path_to_svg_file)
        path_list = []
        parsed_svg = SVG.parse(path_to_svg_file)  # access <g> tag for non-path styles
        elements_list = list(parsed_svg.elements())
    except Exception as e:
        logging.error(e)
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
        width = float(parent_svg['attributes']['width'])
        height = float(parent_svg['attributes']['height'])
        frame_size = min(width, height)
        normaliseScaleFactor = 1 / frame_size
        resizeScaleFactor = 224 / frame_size
    except Exception as e:
        logging.error(e)
        logging.error("Couldn't parse SVG Parent")

    count = 0
    num_paths = len(attributes)
    for att in attributes:

        num_segments = len(att['d'].split(',')) // 3
        if num_segments == 0 or (with_selection and count == num_paths - 1):
            continue

        stroke_width = 15
        color_code = '#000000'
        opacity = 1

        if 'stroke' in att:
            color_code = str(att['stroke'])
        else:
            color_code = str(path_group['attributes']['stroke'])

        if 'stroke-width' in att:
            stroke_width = float(att['stroke-width']) * normaliseScaleFactor
        else:
            stroke_width = (
                float(path_group['attributes']['stroke-width'])
                * normaliseScaleFactor
            )

        if 'stroke-opacity' in att:
            opacity = float(att['stroke-opacity'])
        elif 'opacity' in att:
            opacity = float(att['opacity'])
        elif 'opacity' in path_group['attributes']:
            opacity = str(path_group['attributes']['stroke-opacity'])
        elif 'stroke-opacity' in path_group['attributes']:
            opacity = str(path_group['attributes']['stroke-opacity'])
        else:
            opacity = 1

        color = get_color(color_code, opacity)

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
            print(path)
            path_list.append(data_to_tensor(color, stroke_width, path, num_segments))
        except Exception as e:
            logging.error(e)
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
