# Images, thumbnails, and media

All media for a page lives in that page's folder, next to `index.md`, and is referenced by file name only. Nothing goes in `static/` or `assets/` for a content contribution, and nothing is hotlinked from another site.

## The thumbnail: `feature.webp`

Every page needs exactly one `feature.webp` in its folder. The theme uses it for list cards, related posts, previous/next cards, link previews, and (unless `showHero: false`) a banner at the top of the page.

- **Format**: WebP, exactly **1500x1000** (3:2). The checker enforces this.
- Cards crop to 3:2 from the centre, so keep the subject centred with some margin.
- Two ways to make one:

### Option A: a real image

A screenshot, diagram, or photo that represents the page, resized and cropped to 1500x1000:

```sh
ffmpeg -i source.png -vf "scale=1500:1000:force_original_aspect_ratio=increase,crop=1500:1000" -c:v libwebp -quality 85 feature.webp
```

- It must follow the same rules as any other image (no private names, labelled if composite).
- If it can go out of date (an architecture diagram, a screenshot with counts), add `thumbnailReview: YYYY-MM-DD` and a `thumbnailReviewNote` saying what to check.
- If the same image appears in the body, set `showHero: false` so it is not shown twice.

### Option B: a text title card

For pages without a suitable image. The text lives in front matter and the image is generated from it, so it can always be rebuilt:

```yaml
showHero: false   # required with a card: the card repeats the title
thumbnailCard:
  kicker: "Self-Hosting Palworld · Part 1"
  title: ["Foundation and", "Digging In"]   # one string or a list of lines, 24 characters per line at most
  subtitle: "Proxmox, LinuxGSM, and the config traps"
```

```sh
cd zachleinfo
python3 scripts/thumbnail-card.py content/blog/2026/20261201/index.md   # one page
python3 scripts/thumbnail-card.py            # any card that is missing
```

Needs `ffmpeg` and PyYAML. Re-run it for the page whenever you change the card text.

- **Kicker**: series parts use `<kicker from vocabulary.yaml> · Part N`; portfolio entries use `Portfolio`; standalone posts use the topic (`Homelab`) or `Blog`.
- **Keep card text evergreen**: no job titles, counts, or dates that will go stale.
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
