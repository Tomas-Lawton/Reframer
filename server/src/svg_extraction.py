import torch
from svgpathtools import svg2paths


class DrawingPath:
    def __init__(self, path, color, width, num_segments, is_tied):
        self.path = path
        self.color = color
        self.width = width
        self.num_segments = num_segments
        self.is_tied = is_tied


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
                    color = list(int(hex_code[i : i + 2], 16) / 255 for i in (0, 2, 4))
        color.append(opacity)
        color = torch.tensor(color)
        width = torch.tensor(width)

        try:
            [x_a, x_b] = att['d'].split('c')
        except Exception:
            [x_a, x_b] = att['d'].split('C')
        x0 = [float(x) for x in x_a[2:].split(',')]
        points = [xx.split(',') for xx in x_b[1:].split(' ')]
        points = [[float(x), float(y)] for [x, y] in points]
        path = [x0] + points
        num_segments = len(path) // 3
        path = torch.tensor(path)
        v0 = torch.tensor([0, 0])
        for k in range(path.size(0)):
            path[k, :] += v0
            if k % 3 == 0:
                v0 = path[k, :]

        path_list.append(DrawingPath(path, color, width, num_segments, True))

    return path_list
