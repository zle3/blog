#!/usr/bin/env python3
"""Render text title cards (feature.webp) for pages without a good image.

The card text lives in each page's front matter, so cards can be rebuilt
at any time from the repo alone:

    thumbnailCard:
      kicker: "Self-Hosting Palworld · Part 1"
      title: ["Foundation and", "Digging In"]   # one string or a list of lines
      subtitle: "Proxmox, LinuxGSM and the config traps"

Usage (from the zachleinfo/ folder):
    python3 scripts/thumbnail-card.py              # render cards that are missing
    python3 scripts/thumbnail-card.py --all        # re-render every card
    python3 scripts/thumbnail-card.py content/about/index.md   # specific pages

Needs ffmpeg and PyYAML. Fonts are committed in scripts/fonts (DejaVu,
free license in LICENSE-DejaVu.txt), so output is the same on any machine.
Cards are 1500x1000 (3:2, the theme's card thumbnail ratio) with the text
centred, so nothing is cut off in cards, related posts or link previews.
Keep text evergreen: no job titles, numbers or dates that will change.
"""
import argparse
import pathlib
import subprocess
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT_BOLD = ROOT / "scripts/fonts/DejaVuSans-Bold.ttf"
FONT = ROOT / "scripts/fonts/DejaVuSans.ttf"
W, H = 1500, 1000
BG, TINT, ACCENT, MUTED = "0x1c1b29", "0x84596f@0.18", "0x9b6b84", "0xcdcddb"
MAX_TITLE_CHARS = 24  # per line at 84px; longer lines risk running off the card


def front_matter(path):
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {}
    end = text.index("---", 3)
    # Hugo tolerates tabs in front matter; YAML does not, so normalise them.
    return yaml.safe_load(text[3:end].replace("\t", " ")) or {}


def esc(s):
    return str(s).replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%")


def render(card, out):
    lines = card.get("title") or []
    lines = [lines] if isinstance(lines, str) else list(lines)
    if not lines:
        raise ValueError("thumbnailCard.title is required")
    for line in lines:
        if len(line) > MAX_TITLE_CHARS:
            print(f"  warning: title line '{line}' is {len(line)} chars; split it into two lines", file=sys.stderr)
    kicker = card.get("kicker", "zachle.info")
    subtitle = card.get("subtitle", "")
    n, line_h = len(lines), 96
    top = (H - (60 + n * line_h + 90)) // 2
    f = [
        f"drawbox=x=0:y=0:w={W}:h={H}:color={TINT}:t=fill",
        f"drawtext=fontfile='{FONT}':text='{esc(kicker)}':fontcolor={MUTED}:fontsize=38:x=(w-text_w)/2:y={top}",
        f"drawbox=x={W // 2 - 45}:y={top + 58}:w=90:h=7:color={ACCENT}:t=fill",
    ]
    for i, line in enumerate(lines):
        f.append(f"drawtext=fontfile='{FONT_BOLD}':text='{esc(line)}':fontcolor=white:fontsize=84:x=(w-text_w)/2:y={top + 95 + i * line_h}")
    if subtitle:
        f.append(f"drawtext=fontfile='{FONT}':text='{esc(subtitle)}':fontcolor={MUTED}:fontsize=40:x=(w-text_w)/2:y={top + 110 + n * line_h}")
    f.append(f"drawtext=fontfile='{FONT}':text='zachle.info':fontcolor={ACCENT}:fontsize=32:x=(w-text_w)/2:y={H - 110}")
    graph = f"color=c={BG}:s={W}x{H}[bg];[bg]" + ",".join(f)
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", f"nullsrc=s={W}x{H}",
         "-filter_complex", graph, "-frames:v", "1", "-c:v", "libwebp", "-quality", "90", str(out)],
        check=True,
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pages", nargs="*", help="index.md files to render (default: all pages with thumbnailCard)")
    ap.add_argument("--all", action="store_true", help="re-render cards even if feature.webp exists")
    args = ap.parse_args()

    pages = [pathlib.Path(p).resolve() for p in args.pages] or sorted((ROOT / "content").rglob("index.md"))
    done = 0
    for page in pages:
        card = front_matter(page).get("thumbnailCard")
        if not card:
            if args.pages:
                print(f"skip {page.relative_to(ROOT)}: no thumbnailCard in front matter", file=sys.stderr)
            continue
        out = page.parent / "feature.webp"
        if out.exists() and not (args.all or args.pages):
            continue
        render(card, out)
        print(f"rendered {out.relative_to(ROOT)}")
        done += 1
    print(f"{done} card(s) rendered")


if __name__ == "__main__":
    main()
