import torch
import pydiffvg
import shortuuid


class Trace:
    def __init__(self, shape, shape_group, is_fixed):
        self.shape = shape
        self.shape_group = shape_group
        self.is_fixed = is_fixed


class Drawing:
    def __init__(self, canvas_width, canvas_height):
        self.canvas_width = canvas_width
        self.canvas_height = canvas_height
        self.traces = []
        self.fixed_list = []
        self.img = None
        self.id = shortuuid.uuid()

    def add_paths(self, path_list):
        shapes = []
        shape_groups = []
        for dpath in path_list:
            path = dpath.path.detach().clone()
            width = dpath.width.detach().clone()
            color = dpath.color.detach().clone()
            is_fixed = dpath.is_tied.detach().clone()

            num_control_points = torch.zeros(dpath.num_segments, dtype=torch.int32) + 2
            points = torch.zeros_like(path)
            stroke_width = width * 100
            points[:, 0] = self.canvas_width * path[:, 0]
            points[:, 1] = self.canvas_height * path[:, 1]
            shape = pydiffvg.Path(
                num_control_points=num_control_points,
                points=points,
                stroke_width=stroke_width,
                is_closed=False,
            )
            shapes.append(shape)
            shape_group = pydiffvg.ShapeGroup(
                shape_ids=torch.tensor([len(shapes) - 1]),
                fill_color=None,
                stroke_color=color,
            )
            shape_groups.append(shape_group)
            self.traces.append(Trace(shape, shape_group, True))
            self.fixed_list.append(is_fixed.item())

        if not path_list:
            self.img = torch.ones(
                (1, 3, self.canvas_height, self.canvas_width),
                device='cuda:0' if torch.cuda.is_available() else 'cpu',
            )
        else:
            self.render_img()

    def add_shapes(self, shapes, shape_groups, fixed):
        N = len(self.traces)
        for k in range(len(shapes)):
            shape_groups[k].shape_ids = torch.tensor([k + N])
            self.traces.append(Trace(shapes[k], shape_groups[k], fixed))
            self.fixed_list.append(fixed)

        self.render_img()

    def add_traces(self, trace_list):
        for k in range(len(trace_list)):
            trace_list[k].shape_group.shape_ids = torch.tensor([k + len(self.traces)])
        self.traces += trace_list
        self.render_img()

    def replace_traces(self, trace_list):
        trace_list = sorted(
            trace_list, key=lambda trace: trace.shape_group.shape_ids.item()
        )
        for trace in trace_list:
            idx = trace.shape_group.shape_ids.item()
            if idx < len(self.traces):
                self.traces[idx] = trace
            # If trace idx is larger than number of traces, add it at the end
            else:
                new_idx = len(self.traces)
                trace.shape_group.shape_ids = torch.tensor([new_idx])
                self.traces.append(trace)
        self.render_img()

    def remove_traces(self, inds):
        self.traces = [self.traces[i] for i in range(len(self.traces)) if i not in inds]
        for k in range(len(self.traces)):
            self.traces[k].shape_group.shape_ids = torch.tensor([k])

    def all_shapes_but_kth(self, k):
        shapes = []
        shape_groups = []
        count = 0
        for n, trace in enumerate(self.traces):
            if n != k:
                shapes.append(trace.shape)
                trace.shape_group.shape_ids = torch.tensor([count])
                shape_groups.append(trace.shape_group)
                count += 1
        return shapes, shape_groups

    def all_shapes_except(self, inds):
        shapes = []
        shape_groups = []
        count = 0
        for n, trace in enumerate(self.traces):
            if n not in inds:
                shapes.append(trace.shape)
                trace.shape_group.shape_ids = torch.tensor([count])
                shape_groups.append(trace.shape_group)
                count += 1
        return shapes, shape_groups

    def render_img(self):
        shapes = [trace.shape for trace in self.traces]
        shape_groups = [trace.shape_group for trace in self.traces]
        scene_args = pydiffvg.RenderFunction.serialize_scene(
            self.canvas_width, self.canvas_height, shapes, shape_groups
        )
        render = pydiffvg.RenderFunction.apply
        img = render(self.canvas_width, self.canvas_height, 2, 2, 0, None, *scene_args)
        img = img[:, :, 3:4] * img[:, :, :3] + torch.ones(
            img.shape[0], img.shape[1], 3, device=pydiffvg.get_device()
        ) * (1 - img[:, :, 3:4])
        img = img[:, :, :3].unsqueeze(0).permute(0, 3, 1, 2)
        self.img = img
        return img
