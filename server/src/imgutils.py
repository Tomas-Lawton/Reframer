import io
import PIL.Image
import PIL.ImageDraw
import requests
import numpy as np
from IPython.display import Image
from IPython import display


def imread(url, max_size=None, mode=None):
    if url.startswith(('http:', 'https:')):
        r = requests.get(url)
        f = io.BytesIO(r.content)
    else:
        f = url
    img = PIL.Image.open(f)
    if max_size is not None:
        img = img.resize((max_size, max_size))
    if mode is not None:
        img = img.convert(mode)
    img = np.float32(img) / 255.0
    return img


def np2pil(a):
    if a.dtype in [np.float32, np.float64]:
        a = np.uint8(np.clip(a, 0, 1) * 255)
    return PIL.Image.fromarray(a)


def imwrite(f, a, fmt=None):
    a = np.asarray(a)
    if isinstance(f, str):
        fmt = f.rsplit('.', 1)[-1].lower()
        if fmt == 'jpg':
            fmt = 'jpeg'
        f = open(f, 'wb')
    np2pil(a).save(f, fmt, quality=95)


def imencode(a, fmt='jpeg'):
    a = np.asarray(a)
    if len(a.shape) == 3 and a.shape[-1] == 4:
        fmt = 'png'
    f = io.BytesIO()
    imwrite(f, a, fmt)
    return f.getvalue()


def imshow(a, fmt='jpeg'):
    display(Image(data=imencode(a, fmt)))


def show_img(img):
    img = np.clip(img, 0, 1)
    img = np.uint8(img * 254)
    pimg = PIL.Image.fromarray(img, mode="RGB")
    imshow(pimg)
