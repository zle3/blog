# Images, thumbnails, and media

All media for a page lives in that page's folder, next to `index.md`, and is referenced by file name only. Nothing goes in `static/` or `assets/` for a content contribution, and nothing is hotlinked from another site.

## The thumbnail: `feature.webp`

Every page has exactly one `feature.webp` in its folder. The theme uses it for list cards, related posts, previous/next cards, and link previews. **It is always generated** by `scripts/thumbnail-card.py` from `thumbnailCard` in front matter, so every thumbnail on the site matches the brand ([brand.md](brand.md)). Never make or edit it by hand. The checker fails a page without `thumbnailCard`, and every page with one sets `showHero: false`.

**Text card**, for pages without a good image:

```yaml
showHero: false
thumbnailCard:
  kicker: "Self-Hosting Palworld · Part 1"
  title: ["Foundation and", "Digging In"]   # one string or a list of lines, 24 characters per line at most
  subtitle: "Proxmox, LinuxGSM, and the config traps"
```

**Image card**, a screenshot or diagram from the page in the branded frame:

```yaml
showHero: false
thumbnailCard:
  kicker: "AI Agent Platform · Part 2"
  title: ["Running 29 AI Agents", "Like a Dev Team"]
  image: merged-prs-daily.webp   # a file in this folder; it counts as used
  focus: center                  # top (default), center, or bottom
  fit: contain                   # contain for diagrams and slides; cover (default) for screenshots
```

```sh
cd zachleinfo
python3 scripts/thumbnail-card.py content/blog/2026/20261201/index.md   # one page
python3 scripts/thumbnail-card.py            # any card that is missing
python3 scripts/thumbnail-card.py --all      # every card (after a brand change)
```

Needs Pillow and PyYAML. Re-run it for the page whenever you change the card text or its image.

- **Kicker**: series parts use `<kicker from vocabulary.yaml> · Part N`; portfolio entries use `Portfolio`; standalone posts use the topic (`Homelab`) or `Blog`.
- **Title**: the post's own subtitle or name, shortened to fit (24 characters per line, two lines at most on image cards).
- **Image**: must already follow the brand: a branded diagram or a plain screenshot. Never an unbranded light-theme slide.
- **Keep card text evergreen**: no job titles, counts, or dates that will go stale.
- If the image can go out of date (an architecture diagram, a screenshot with counts), add `thumbnailReview: YYYY-MM-DD` and a `thumbnailReviewNote` saying what to check.
- Oxford commas apply on cards too.

## Images in the body

- **Format**: WebP for everything new. (Older posts keep their PNG and JPG files; do not convert them.)

  ```sh
  ffmpeg -i shot.png -c:v libwebp -quality 85 shot.webp
  ```

- **Size**: under 1 MB each; downscale anything wider than about 2,000 px. Video under 8 MB.
- **File names**: lowercase kebab-case that says what it is: `backup-progress.webp`, `site-leaderboard.webp`. No spaces, no capitals, no `IMG_1234`.
- **Alt text is required** and describes what the image shows, for someone who cannot see it. An optional title in quotes becomes the visible caption:

  ```markdown
  ![A dialog asking where to save the backup, with a USB drive marked as recommended](backup-location.webp "It really wants you to pick the USB stick.")
  ```

- Remove files you end up not using; the checker warns about unreferenced files.

## Diagrams, charts, and readability

Anything you draw (diagram, chart, slide, label, burned-in caption) follows [brand.md](brand.md): plum canvas, brand text colours, brand series and meaning colours, and text large enough to read at 1080p. Every body image and carousel slide opens full-screen on click, so publish diagrams at 2560 px wide. Plain screenshots are never recoloured.

## What a screenshot may show

Before adding any image, look at every pixel of it:

- No real names, usernames, avatars, account or Discord IDs, email addresses, IP addresses, hostnames, tokens, or private messages. Prefer captures made against demo data with made-up names over blurring.
- No real floor plans, camera views, or anything that reveals the owner's home or network layout in detail.
- **Label what is not a plain capture.** If an image is a composite, a re-creation, a render with sample data, or an illustration, say so in the caption or alt text: "Composite: a render of the meter using the app's sample fight with made-up names, placed over a game screenshot". If a whole post uses demo data, say so once near the top as well.
- Charts and diagrams containing numbers follow the verified-numbers rule.

## Shortcodes

Only these are in use. Do not add new shortcodes or raw HTML for layout.

**Carousel** (several related screenshots; site override in `layouts/shortcodes/carousel.html`):

```
{{< carousel images="{app-home.webp,app-settings.webp}" captions="{app-home.webp:The home page with one card per tool,app-settings.webp:Settings with demo data}" aspectRatio="16-9" >}}
```

- Every image needs a caption; it is also the alt text.
- **Captions cannot contain commas** (the comma separates entries). Rephrase with "and" or "with".
- `aspectRatio` is `16-9` (default), `4-3`, `3-4`, or `9-16`; pick the one closest to the images, which should all share a shape.
- Use a carousel for three or more similar screenshots; one or two are plain images.

**Video** (short silent clips):

```
{{< video src="clip.mp4" poster="clip-poster.webp" muted=true loop=true autoplay=true playsinline=true controls=true caption="What the clip shows. Say so if it is a composite." >}}
```

Always include a `poster` image and a caption.

**Mermaid** (`{{< mermaid >}} ... {{< /mermaid >}}`) for simple diagrams, as in the Palworld portfolio entry. **`ref`** is used on the homepage only; in posts, link with root-relative paths. **`site-status`** belongs to the status page alone.
