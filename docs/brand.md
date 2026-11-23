# Brand: colours, thumbnails, diagrams, and readable images

Every image this site makes for itself (thumbnails, diagrams, charts, labels on composites, captions burned into a video) uses one palette and one look, whichever project or agent produced it. Plain screenshots of apps, games, and terminals are the exception: they show the thing as it is and are never recoloured.

## The palette

The single source of truth is `zachleinfo/data/brand.yaml`. Scripts read it through `zachleinfo/scripts/brandkit.py`. A generator in another project should read that file, or copy these values exactly; never pick colours by eye.

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#352330` | Background of every generated image (plum) |
| `surface` | `#43303e` | Boxes, panels, and cards on the canvas |
| `surface_strong` | `#523b4b` | Raised or highlighted boxes |
| `line` | `#6a5162` | Borders, gridlines, connectors |
| `code_bg` | `#22161f` | Terminal and code panels |
| `text` | `#ffffff` | Titles, primary text |
| `text_body` | `#ece4ea` | Normal text |
| `text_muted` | `#cdcddb` | Kickers, subtitles, captions, axis labels |
| `primary` | `#9b6b84` | Accent bar, `zachle.info` mark |
| `primary_light` | `#d3a9c0` | Marks, lines, and fills on the canvas |

**Data series** go in this order: mauve `#d3a9c0`, rose `#fb7185`, lavender `#a0a0bb`, then blush `#fecdd3`.

**Meaning colours.** Use these instead of green and red for before/after, found/missed, pass/fail, and for boxes and tags drawn on top of screenshots:

- **Good** (after, found, pass, recommended): `#d3a9c0`
- **Bad** (before, missed, fail, warning): `#fb7185`
- **Neutral:** `#a0a0bb`

If a caption or post names a colour ("the rose boxes"), it must match what the image shows.

Fonts: DejaVu Sans and DejaVu Sans Bold (`zachleinfo/scripts/fonts/`). Diagrams made in HTML may use Inter.

## Thumbnails are always generated

Every page's `feature.webp` comes from `zachleinfo/scripts/thumbnail-card.py`, driven by `thumbnailCard` in front matter. The checker fails a page without it. There are two kinds, and both share the same frame: kicker, mauve bar, title, and the `zachle.info` mark.

- **Text card:** `kicker`, `title`, `subtitle`.
- **Image card:** `kicker`, `title`, and `image:` (a file in the page's folder), shown in a rounded panel.
  - Use `fit: contain` for diagrams and slides, so nothing is cut off.
  - Use the default `fit: cover` with `focus: top` for screenshots.
  - The image itself must already follow this brand: a branded diagram, or a plain screenshot.

Never hand-make or edit `feature.webp`. Change the front matter and re-run the script. See [images.md](images.md) for the exact keys.

## Diagrams, charts, and slides

- Draw them on the plum `canvas`, with `surface` boxes, `line` borders, and the text tokens. No light or white backgrounds, and no blue, green, or orange.
- Layout to copy: a small uppercase kicker in `primary_light`, a bold title, a muted subtitle, the content, then a muted footer line with the source on the left and any caveat on the right.
- Render at 2560x1440 (or 1500x1000 for a thumbnail source) and save as WebP under 1 MB.
- **An existing light-theme graphic** can be converted without changing its content:

  ```sh
  python3 scripts/brand-recolor.py in.webp out.webp
  ```

  This works for flat diagrams and charts on white or off-white backgrounds. Dark code panels inside them are handled.
- **A dark-framed slide with screenshots inside** (before/after panels, annotated captures) uses dark mode:

  ```sh
  python3 scripts/brand-recolor.py --dark in.webp out.webp
  ```

  This recolours the frame and its labels, and swaps green or red annotation boxes for good or bad. The screenshots themselves stay untouched.
  - Then fix any burned-in text that names a colour. `brandkit.footnote()` rewrites the bottom line.
  - Never run either mode on a plain screenshot or photo.
- **Start from what is published.** If you have a higher-resolution original, compare it with the published file first. The published copy may have blurring (names, chat, quest text, currency) that the original lacks. Never publish the unblurred one.

## Labels on screenshots and video

Text added on top of a screenshot or video frame, like "Composite" labels, uses the brand label: a plum pill with a thin `line` border, a mauve dot, and white bold text. Use `brandkit.label_pill(image, text, box)`. For video, make the pill as a transparent PNG (`layer_only=True`) and overlay it with ffmpeg:

```sh
ffmpeg -i in.mp4 -i pill.png -filter_complex "[0:v][1:v]overlay=0:0,format=yuv420p" -c:v libx264 -crf 22 -preset slow -movflags +faststart -an out.mp4
```

Keep the poster image's label in the same place as the video's.

## Readable at 1080p

Readers see body images about 700 px wide, so text that is fine at full size becomes unreadable. Every body image and carousel slide opens full-screen when clicked, through `static/js/lightbox.js`, which shows the original file. That helps, but it is a fallback, not permission for tiny text:

- At the image's own width, body text must be at least **1.1%** of the width (about 28 px at 2560, 18 px at 1600). Titles must be at least **2.5%**.
- Prefer two simpler images over one dense one.
- Publish diagrams and slides at 2560 px wide so the lightbox has detail to show. Screenshots go at their native size, up to about 2,560 px.
- Captions repeat the key numbers or findings in text. The image supports the text; it never replaces it.

## What the checker enforces

- `thumbnail`: every page has `thumbnailCard`, and `feature.webp` is 1500x1000.
- `brand` (warning): a non-feature WebP in a new bundle has a light background. Fix it, unless it is a plain screenshot of a light-themed app, and say so in your report.
- Colours of a screenshot's annotations, label styling, and text size can't be checked automatically. Look at every image at 1080p before you finish.
