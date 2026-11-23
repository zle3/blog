#!/usr/bin/env python3
"""Recolour a light-theme diagram, chart, or slide into the brand palette.

For flat graphics drawn on a light background (white or off-white "paper"):
architecture diagrams, bar and line charts, process slides. Each pixel is
un-mixed into paper plus one ink colour, the ink is mapped to the brand
(dark and grey ink become light text, blues become mauve, oranges and reds
become rose, greens become lavender), and the result is mixed back onto the
plum canvas. Text, lines, and numbers stay exactly where they were, so the
image's content (and any verified numbers in it) does not change.

--dark is for slides with a dark frame around screenshots or game shots
(before/after panels, annotated captures): the frame, its text, and its
labels are recoloured, and annotation colours drawn on the screenshots
(boxes, tags) are swapped for brand colours. The screenshots themselves are
left alone. Never use either mode on a plain photo or app screenshot.
See docs/brand.md.

Usage (from zachleinfo/):
    python3 scripts/brand-recolor.py in.webp [out.webp]   # default: overwrite
    python3 scripts/brand-recolor.py --dark in.webp [out.webp]
    python3 scripts/brand-recolor.py --check in.webp       # print paper colour only

Needs Pillow and PyYAML.
"""
import argparse
import colorsys
import pathlib
import sys
from collections import Counter

from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from brandkit import BRAND, CANVAS, rgb  # noqa: E402

TEXT = rgb("text")
MUTED = rgb("text_muted")
MAUVE = rgb("primary_light")
ROSE = rgb(BRAND["series"][1])
LAVENDER = rgb(BRAND["series"][2])
BLUSH = rgb(BRAND["series"][3])


def mix(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def paper_colour(im):
    small = im.resize((200, int(200 * im.height / im.width)))
    common = Counter(pixels(small)).most_common(1)[0][0]
    if sum(common) / 3 < 200:
        raise SystemExit(f"background {common} is not light; this tool is for light-theme graphics only")
    return common


def brand_ink(ink, semantic=False):
    """Map an ink colour (0-255 RGB) to its brand colour.

    semantic=True (annotated screenshots): green means good/found and maps
    to the brand's good colour, red/orange means bad/missed and maps to bad.
    """
    r, g, b = (c / 255 for c in ink)
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    if s < 0.28 or v < 0.12:
        # Neutral ink: black and dark grey -> white text; mid grey -> muted.
        return mix(MUTED, TEXT, min(1.0, (1 - v) / 0.75))
    deg = h * 360
    if 185 <= deg < 300:          # blue, indigo, violet
        return MAUVE
    if 300 <= deg < 345:          # magenta, pink
        return BLUSH
    if deg >= 345 or deg < 45:    # red, orange
        return ROSE
    if 45 <= deg < 70:            # amber, yellow
        return BLUSH
    return rgb("good") if semantic else LAVENDER   # greens and teals


def pixels(im):
    get = getattr(im, "get_flattened_data", None) or im.getdata
    return list(get())


def dark_panels(im, paper):
    """Bounding boxes of large dark filled areas (terminals, code panels)."""
    k = 4
    small = im.resize((im.width // k, im.height // k), Image.BOX)
    w, h = small.size
    px = pixels(small)
    dark = [sum(p) / 3 < 70 for p in px]
    seen = [False] * len(px)
    boxes = []
    for start in range(len(px)):
        if not dark[start] or seen[start]:
            continue
        stack, area = [start], 0
        x0 = y0 = 10 ** 9
        x1 = y1 = -1
        seen[start] = True
        while stack:
            i = stack.pop()
            area += 1
            x, y = i % w, i // w
            x0, x1, y0, y1 = min(x0, x), max(x1, x), min(y0, y), max(y1, y)
            for j in (i - 1 if x else -1, i + 1 if x < w - 1 else -1, i - w, i + w):
                if 0 <= j < len(px) and dark[j] and not seen[j]:
                    seen[j] = True
                    stack.append(j)
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        if area > 0.01 * w * h and area > 0.5 * bw * bh:
            boxes.append((x0 * k, y0 * k, (x1 + 1) * k, (y1 + 1) * k, px[start]))
    return boxes


def recolour(im):
    im = im.convert("RGB")
    paper = paper_colour(im)
    boxes = dark_panels(im, paper)
    code_bg = rgb("code_bg")
    w = im.width
    cache, dcache = {}, {}
    out = []
    for idx, px in enumerate(pixels(im)):
        x, y = idx % w, idx // w
        box = next((b for b in boxes if b[0] <= x < b[2] and b[1] <= y < b[3]), None)
        if box and max(abs(px[i] - paper[i]) for i in range(3)) > 14:
            hit = dcache.get(px)
            if hit is None:
                d = box[4]
                a = max(max(0.0, (px[i] - d[i]) / max(255 - d[i], 1)) for i in range(3))
                if a < 0.03:
                    hit = code_bg
                else:
                    ink = tuple(min(255.0, max(0.0, (px[i] - d[i] * (1 - a)) / a)) for i in range(3))
                    r, g, b = (c / 255 for c in ink)
                    s = colorsys.rgb_to_hsv(r, g, b)[1]
                    target = TEXT if s < 0.28 else brand_ink(ink)
                    hit = tuple(round(c) for c in mix(code_bg, target, a))
                dcache[px] = hit
            out.append(hit)
            continue
        hit = cache.get(px)
        if hit is None:
            a = max(max(0.0, (paper[i] - px[i]) / max(paper[i], 1)) for i in range(3))
            if a < 0.015:
                hit = CANVAS
            else:
                ink = tuple(min(255.0, max(0.0, (px[i] - paper[i] * (1 - a)) / a)) for i in range(3))
                hit = tuple(round(c) for c in mix(CANVAS, brand_ink(ink), a))
            cache[px] = hit
        out.append(hit)
    res = Image.new("RGB", im.size)
    res.putdata(out)
    return res


def components(mask, w, h, min_frac):
    """Bounding boxes of 4-connected True regions bigger than min_frac."""
    seen = [False] * len(mask)
    boxes = []
    for start in range(len(mask)):
        if not mask[start] or seen[start]:
            continue
        stack, area = [start], 0
        x0 = y0 = 10 ** 9
        x1 = y1 = -1
        seen[start] = True
        while stack:
            i = stack.pop()
            area += 1
            x, y = i % w, i // w
            x0, x1, y0, y1 = min(x0, x), max(x1, x), min(y0, y), max(y1, y)
            for j in (i - 1 if x else -1, i + 1 if x < w - 1 else -1, i - w, i + w):
                if 0 <= j < len(mask) and mask[j] and not seen[j]:
                    seen[j] = True
                    stack.append(j)
        if area > min_frac * w * h:
            boxes.append((x0, y0, x1 + 1, y1 + 1))
    return boxes


def saturated(px):
    r, g, b = (c / 255 for c in px)
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    return s > 0.45 and v > 0.45


def recolour_dark(im):
    im = im.convert("RGB")
    small = im.resize((im.width // 4, im.height // 4), Image.BOX)
    frame = Counter(pixels(small)).most_common(1)[0][0]
    if sum(frame) / 3 > 60:
        raise SystemExit(f"frame colour {frame} is not dark; use the default (light) mode")
    w4, h4 = small.size
    far = [max(abs(p[i] - frame[i]) for i in range(3)) > 24 for p in pixels(small)]
    photos = [tuple(v * 4 for v in b) for b in components(far, w4, h4, 0.02)]

    def in_photo(x, y):
        return any(b[0] <= x < b[2] and b[1] <= y < b[3] for b in photos)

    def on_edge(x, y):
        """Within a few pixels of a panel's edge, where outline strokes sit."""
        return any(
            b[0] <= x < b[2] and b[1] <= y < b[3]
            and min(x - b[0], b[2] - 1 - x, y - b[1], b[3] - 1 - y) < 7
            for b in photos
        )

    w = im.width
    src = pixels(im)
    # Annotation colours: saturated colours used on the frame (badges, tags).
    marks = Counter(
        (p[0] // 8 * 8, p[1] // 8 * 8, p[2] // 8 * 8)
        for i, p in enumerate(src[::7])
        if saturated(p) and not in_photo((i * 7) % w, (i * 7) // w)
    )
    keys = [c for c, n in marks.most_common(6) if n > 40]
    out, cache = [], {}
    for idx, px in enumerate(src):
        x, y = idx % w, idx // w
        if in_photo(x, y):
            hit = px
            if max(abs(px[i] - frame[i]) for i in range(3)) <= 6:
                out.append(CANVAS)   # frame-coloured padding inside a panel
                continue
            for k in keys:
                if max(abs(px[i] - k[i] - 4) for i in range(3)) < 40:
                    hit = tuple(round(c) for c in brand_ink(px, semantic=True))
                    break
            else:
                # Bright, saturated annotation green (boxes and borders that
                # were scaled up): brighter and purer than any grass.
                h, sat, v = colorsys.rgb_to_hsv(*(c / 255 for c in px))
                if 0.30 <= h <= 0.45 and sat > 0.5 and v > 0.72:
                    hit = rgb("good")
                elif on_edge(x, y) and sat > 0.3 and v > 0.3:
                    # Panel outline strokes (green = found, red = missed).
                    if 0.25 <= h <= 0.47:
                        hit = mix(CANVAS, rgb("good"), min(1.0, v * 1.1))
                    elif h >= 0.94 or h <= 0.04:
                        hit = mix(CANVAS, rgb("bad"), min(1.0, v * 1.1))
                    hit = tuple(round(c) for c in hit)
            out.append(hit)
            continue
        hit = cache.get(px)
        if hit is None:
            a = max(max(0.0, (px[i] - frame[i]) / max(255 - frame[i], 1)) for i in range(3))
            if a < 0.03:
                hit = CANVAS
            else:
                ink = tuple(min(255.0, max(0.0, (px[i] - frame[i] * (1 - a)) / a)) for i in range(3))
                target = ink if not saturated(ink) and colorsys.rgb_to_hsv(*(c / 255 for c in ink))[1] < 0.28 else brand_ink(ink, semantic=True)
                hit = tuple(round(c) for c in mix(CANVAS, target, a))
            cache[px] = hit
        out.append(hit)
    res = Image.new("RGB", im.size)
    res.putdata(out)
    return res


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("dst", nargs="?")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--dark", action="store_true", help="dark-framed slide with screenshots inside")
    args = ap.parse_args()
    src = pathlib.Path(args.src)
    im = Image.open(src)
    if args.check:
        print(paper_colour(im.convert("RGB")))
        return
    dst = pathlib.Path(args.dst) if args.dst else src
    res = recolour_dark(im) if args.dark else recolour(im)
    res.save(dst, quality=90, method=6) if dst.suffix == ".webp" else res.save(dst)
    print(f"recoloured {src} -> {dst}")


if __name__ == "__main__":
    main()
