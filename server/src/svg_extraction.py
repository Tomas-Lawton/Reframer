import torch

class DrawingPath:
    def __init__(self, path, color, width, num_segments, is_fixed):
        self.path = path
        self.color = color
        self.width = width
        self.num_segments = num_segments
        self.is_fixed = is_fixed


def data_to_tensor(color, stroke_width, path, num_segments, is_fixed):
    color = torch.tensor(color)
    stroke_width = torch.tensor(stroke_width)
    v0 = torch.tensor([0, 0])
    path = torch.tensor(path)
    for k in range(path.size(0)):
        path[k, :] += v0
        if k % 3 == 0:
            v0 = path[k, :]
    return DrawingPath(path, color, stroke_width, num_segments, is_fixed)


def calculate_region(region, normaliseScaleFactor):
    leftX = min(
        float(region['x1']) * normaliseScaleFactor,
        float(region['x2']) * normaliseScaleFactor,
    )
    rightX = max(
        float(region['x1']) * normaliseScaleFactor,
        float(region['x2']) * normaliseScaleFactor,
    )
    bottomY = min(
        float(region['y1']) * normaliseScaleFactor,
        float(region['y2']) * normaliseScaleFactor,
    )
    topY = max(
        float(region['y1']) * normaliseScaleFactor,
        float(region['y2']) * normaliseScaleFactor,
    )

    return {
        'x0': leftX,
        'x1': rightX,
        'y0': bottomY,
        'y1': topY,
    }

def process(data, s, w, h):
    path_list = []
    for path in data: 
        points = []
        num_segments = len(path['path_data'].split(',')) // 3
        spaced_data = path['path_data'].split('c')
        x0 = spaced_data[0][1:].split(',')  # absolute M instead of m
        curve_list = [
            spaced_data.split(' ') for spaced_data in spaced_data[1:]
        ]  
        point_list = []
        for curve in curve_list:
            for i in range(3):
                point_list.append(curve[i])
        tuple_array = [
            tuple.split(',') for tuple in point_list
        ]  
        points_array = [
            [
                round(float(x) * s, 5),
                round(float(y) * s , 5),
            ]
            for [x, y] in tuple_array
        ]
        start_x = round(float(x0[0]) / w, 5)
        start_y = round(float(x0[1]) / h, 5)
        x0 = [start_x, start_y]
        points = [x0] + points_array

        if len(points) > 0:
            path_tensor = data_to_tensor(path["color"], float(path['stroke_width'] * s), points, num_segments, path["color"])
            path_list.append(path_tensor)
    return path_list