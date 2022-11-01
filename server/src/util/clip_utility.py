import torch

class DrawingPath:
    def __init__(self, path, color, width, num_segments, is_fixed):
        self.path = path
        self.color = color
        self.width = width
        self.num_segments = num_segments
        self.is_fixed = is_fixed


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


def data_to_tensor(color, stroke_width, path, num_segments, tie):
    color = torch.tensor(color)
    stroke_width = torch.tensor(stroke_width)
    v0 = torch.tensor([0, 0])
    path = torch.tensor(path)
    tie = torch.tensor(tie)
    for k in range(path.size(0)):
        path[k, :] += v0
        if k % 3 == 0:
            v0 = path[k, :]
    return DrawingPath(path, color, stroke_width, num_segments, tie)


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

