"""Shared brand helpers for the image scripts (see docs/brand.md).

Loads data/brand.yaml and exposes the palette as RGB tuples plus fonts.
Import from scripts/ (sys.path is the script's folder):

    from brandkit import BRAND, rgb, font
"""
import pathlib

import yaml
from PIL import Image, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
BRAND = yaml.safe_load((ROOT / "data/brand.yaml").read_text(encoding="utf-8"))


def rgb(value):
    """'#rrggbb' (or a brand key) -> (r, g, b)."""
    value = BRAND.get(value, value) if isinstance(value, str) and not value.startswith("#") else value
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def font(size, bold=False):
    return ImageFont.truetype(str(ROOT / BRAND["fonts"]["bold" if bold else "regular"]), size)


CANVAS = rgb("canvas")
SERIES = [rgb(c) for c in BRAND["series"]]


def label_pill(im, text, box, size=None, layer_only=False):
    """Draw a brand caption label (plum pill, white bold text) over `box`.

    `box` is (x0, y0, x1, y1) of the area to cover, for example an old
    burned-in caption. Text starts at the box's left edge and is sized to
    the box height unless `size` is given. Returns the image (RGB).
    """
    from PIL import ImageDraw

    im = im.convert("RGBA")
    x0, y0, x1, y1 = box
    h = y1 - y0
    f = font(size or max(12, int(h * 0.62)), bold=True)
    pad = int(h * 0.45)
    room = (x1 - x0) - pad * 2 - int(h * 0.55)
    while f.getbbox(text)[2] > room and f.size > 11:
        f = font(f.size - 1, bold=True)
    tw = f.getbbox(text)[2]
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    right = max(x1, x0 + tw + pad * 2 + int(h * 0.5))
    d.rounded_rectangle((x0, y0, right, y1), radius=h // 2, fill=CANVAS + (250,), outline=rgb("line") + (255,), width=max(1, h // 22))
    dot = int(h * 0.22)
    cy = (y0 + y1) // 2
    d.ellipse((x0 + pad, cy - dot // 2, x0 + pad + dot, cy + dot // 2), fill=rgb("primary_light") + (255,))
    tb = f.getbbox(text)
    d.text((x0 + pad + dot + int(h * 0.3), cy - (tb[1] + tb[3]) // 2), text, font=f, fill=rgb("text") + (255,))
    if layer_only:
        return layer
    return Image.alpha_composite(im, layer).convert("RGB")


def caption_box(im, region=(0.0, 0.86, 0.7, 1.0), pad=0.012):
    """Bounding box of a burned-in white caption in `region` (fractions)."""
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    xs, ys = [], []
    for y in range(int(h * region[1]), int(h * region[3])):
        for x in range(int(w * region[0]), int(w * region[2])):
            r, g, b = px[x, y]
            if r > 238 and g > 238 and b > 238:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    p = int(w * pad)
    return (max(0, min(xs) - p), max(0, min(ys) - p), min(w, max(xs) + p), min(h, max(ys) + p))


def footnote(im, text, size=None, margin=None):
    """Replace the bottom footnote line of a slide with `text` in brand muted."""
    from PIL import ImageDraw

    im = im.convert("RGB")
    w, h = im.size
    margin = margin if margin is not None else int(w * 0.02)
    px = im.load()
    rows = [y for y in range(int(h * 0.93), h) if any(max(abs(px[x, y][i] - CANVAS[i]) for i in range(3)) > 40 for x in range(0, int(w * 0.8), 2))]
    if not rows:
        return im
    y0, y1 = rows[0], rows[-1]
    d = ImageDraw.Draw(im)
    d.rectangle((0, y0 - 6, w, min(h - 1, y1 + 6)), fill=CANVAS)
    f = font(size or max(11, int((y1 - y0) * 0.95)))
    while f.getbbox(text)[2] > w - 2 * margin and f.size > 10:
        f = font(f.size - 1)
    tb = f.getbbox(text)
    d.text((margin, (y0 + y1) // 2 - (tb[1] + tb[3]) // 2), text, font=f, fill=rgb("text_muted"))
    return im
