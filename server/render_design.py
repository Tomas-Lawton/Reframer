import pydiffvg
import torch
import pickle
import random

def render_save_img(path_list, canvas_height, canvas_width):

    # Initialize Curves
    shapes = []
    shape_groups = []

    # First the ones from my drawing
    for dpath in path_list:
        num_control_points = torch.zeros(dpath.num_segments, dtype = torch.int32) + 2
        points = torch.zeros_like(dpath.path)
        stroke_width = dpath.width*100
        points[:, 0] = canvas_width*dpath.path[:,0]
        points[:, 1] = canvas_height*dpath.path[:,1]
        path = pydiffvg.Path(num_control_points = num_control_points,
                            points = points, stroke_width = stroke_width,
                            is_closed = False)
        shapes.append(path)
        path_group = pydiffvg.ShapeGroup(shape_ids = torch.tensor(
            [len(shapes) - 1]), fill_color = None, stroke_color = dpath.color)
        shape_groups.append(path_group)

    scene_args = pydiffvg.RenderFunction.serialize_scene(
        canvas_width, canvas_height, shapes, shape_groups
    )
    render = pydiffvg.RenderFunction.apply
    img = render(canvas_width, canvas_height, 2, 2, 0, None, *scene_args)

    points_vars = []
    stroke_width_vars = []
    color_vars = []
    for path in shapes:
        path.points.requires_grad = True
        points_vars.append(path.points)
        path.stroke_width.requires_grad = True
        stroke_width_vars.append(path.stroke_width)
    for group in shape_groups:
        group.stroke_color.requires_grad = True
        color_vars.append(group.stroke_color)
        
    img = img[:, :, 3:4] * img[:, :, :3] + torch.ones(img.shape[0], img.shape[1], 3, device = pydiffvg.get_device()) * (1 - img[:, :, 3:4])
    
    with open('tmp/img0.pkl', 'wb') as f:
        pickle.dump(img, f)
    with open('tmp/points_vars.pkl', 'wb') as f:
        pickle.dump(points_vars, f)
    with open('tmp/stroke_width_vars.pkl', 'wb') as f:
        pickle.dump(stroke_width_vars, f)
    with open('tmp/color_vars.pkl', 'wb') as f:
        pickle.dump(color_vars, f)

    return shapes, shape_groups


def build_random_curves(num_paths, canvas_width, canvas_height, x0, x1, y0, y1):

    # Initialize Curves
    shapes = []
    shape_groups = []

    # Add random curves
    for i in range(num_paths):
        num_segments = random.randint(1, 3)
        num_control_points = torch.zeros(num_segments, dtype = torch.int32) + 2
        points = []
        p0 = (random.random()*(x1-x0)+x0, random.random()*(y1-y0)+1-y1)
        points.append(p0)
        for j in range(num_segments):
            radius = 0.1
            p1 = (p0[0] + radius * (random.random() - 0.5), p0[1] + radius * (random.random() - 0.5))
            p2 = (p1[0] + radius * (random.random() - 0.5), p1[1] + radius * (random.random() - 0.5))
            p3 = (p2[0] + radius * (random.random() - 0.5), p2[1] + radius * (random.random() - 0.5))
            points.append(p1)
            points.append(p2)
            points.append(p3)
            p0 = p3
        points = torch.tensor(points)
        points[:, 0] *= canvas_width
        points[:, 1] *= canvas_height
        path = pydiffvg.Path(num_control_points = num_control_points, points = points, stroke_width = torch.tensor(1.0), is_closed = False)
        shapes.append(path)
        path_group = pydiffvg.ShapeGroup(shape_ids = torch.tensor([len(shapes) - 1]), fill_color = None, stroke_color = torch.tensor([random.random(), random.random(), random.random(), random.random()]))
        shape_groups.append(path_group)

    return shapes, shape_groups


def load_vars():
    with open('tmp/points_vars.pkl', 'rb') as f:
        points_vars0 = pickle.load(f)
    with open('tmp/stroke_width_vars.pkl', 'rb') as f:
        stroke_width_vars0 = pickle.load(f)
    with open('tmp/color_vars.pkl', 'rb') as f:
        color_vars0 = pickle.load(f)
    with open('tmp/img0.pkl', 'rb') as f:
        img0 = pickle.load(f)

    return points_vars0, stroke_width_vars0, color_vars0, img0


def add_shape_groups(a, b):
    shape_groups = []
    for k, group in enumerate(a+b):
        group.shape_ids = torch.tensor([k])
        shape_groups.append(group)
    return shape_groups