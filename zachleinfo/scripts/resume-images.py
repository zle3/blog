#!/usr/bin/env python3
"""Render the resume PDF's pages as WebP images for the phone preview.

Large screens embed the PDF itself; small screens (under 768px) show these
images instead, because mobile browsers don't render PDFs in an iframe.
Re-run after replacing content/resume/Zachary-Le-Resume.pdf:

    python3 scripts/resume-images.py

Needs pypdfium2 and Pillow (pip install pypdfium2 pillow, in a venv is fine).
Writes content/resume/page-1.webp, page-2.webp, ... and removes stale pages.
"""
import pathlib

import pypdfium2 as pdfium

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIR = ROOT / "content/resume"
PDF = DIR / "Zachary-Le-Resume.pdf"
WIDTH = 1240  # px; sharp on 3x phone screens without being heavy

doc = pdfium.PdfDocument(str(PDF))
for old in DIR.glob("page-*.webp"):
    old.unlink()
for i, page in enumerate(doc, 1):
    w, _ = page.get_size()
    img = page.render(scale=WIDTH / w).to_pil().convert("RGB")
    out = DIR / f"page-{i}.webp"
    img.save(out, "WEBP", quality=85, method=6)
    print(f"rendered {out.relative_to(ROOT)} ({img.width}x{img.height})")
