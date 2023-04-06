use_negative = True
normalize_clip = True
max_width = 5
canvas_w = 224
canvas_h = 224
num_augs = 4
num_iter = 9000 #shouldn't reach this
w_geo = 10

prune_places = [round(num_iter * (k + 1) * 0.8 / 1) for k in range(1)]
p0 = 0.4
refresh_rate = 10