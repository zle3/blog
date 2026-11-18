# zachle.info blog

[link to blog](https://zachle.info)

## Recent

[demo1 - gcp, terraform](https://demo1.zachle.info/) ---> [link to post](https://www.zachle.info/portfolio/2026/gcp-terraform-demo/)

## Description

blog describing my project and technical experience

## Tech Stack

front end: hugo (theme: [blowfish](https://themes.gohugo.io/themes/blowfish/)), html, Tailwind css, js, yaml

back end: firebase auth, firestore

devops: github, cloudflare pages, dns

## Build

Cloudflare Pages runs `bash build.sh` from `zachleinfo/`. The script pins the
Hugo version (currently 0.169.0, extended) and verifies its checksum, so the
build does not depend on the Cloudflare image default. When upgrading Hugo or
the theme, bump `HUGO_VERSION` and `HUGO_SHA256` in `zachleinfo/build.sh`.

The theme (Blowfish v3.10.0) is vendored in `zachleinfo/themes/blowfish/`.
Local overrides that must be re-checked on theme upgrades:

- `zachleinfo/layouts/partials/article-meta/basic.html` (views/likes on single pages only)
- `zachleinfo/layouts/partials/vendor.html` (Firebase loader as external file, for CSP)
- `zachleinfo/assets/css/custom.css` (design refinements)

## Deployment

this blog automatically updates via CI/CD when a commit is pushed to the github repo

## How to add posts

how to add post:

1. make dir: `zachleinfo/content/blog\<year>/<yyyymmdd>/`
2. add `index.md` inside, front matter like:

```
---
title: "Post Title"
date: 2026-07-03T12:00:00+08:00
tags: ["Blog"]
summary: "short summary"
description: "short desc"
keywords: "keyword"
url: "/blog/2026/slug-name"
---
```

3. body: markdown below ---, headers with ##.
4. images: drop next to index.md in same folder, ref by filename (Hugo page bundle, Blowfish auto-processes via resources/_gen).
5. commit + push. CI/CD (Cloudflare Pages) auto-builds/deploys.

portfolio posts have the same pattern, just under `content/portfolio/<year>/<yyyymm>/`.

## File Tree

```
blog/
├── .gitignore
├── .gitattributes
├── README.md
└── zachleinfo/                      # Hugo site root
    ├── hugo.toml                    # top-level site config (baseURL, title, theme)
    ├── config/
    │   └── _default/
    │       ├── hugo.toml            # main Hugo settings
    │       ├── languages.en.toml    # language/locale config
    │       ├── markup.toml          # goldmark (markdown) rendering config
    │       ├── menus.en.toml        # nav menu structure
    │       ├── module.toml          # Hugo/theme version requirements
    │       └── params.toml          # theme + site params (Firebase, article/list flags, etc.)
    ├── content/
    │   ├── _index.md                # homepage content
    │   ├── about/ now/ resume/      # page bundles: index.md + feature.webp (resume/ also holds the PDF)
    │   ├── privacy/ status/
    │   ├── blog/                    # posts go here
    │   │   └── 2024/
    │   │       ├── 20240629/
    │   │       └── 20241101/
    │   └── portfolio/
    │       ├── 2024/
    │       │   └── 202410/
    │       └── 2026/
    │           └── 202607/
    ├── assets/
    │   ├── css/
    │   │   └── schemes/             # custom color scheme overrides
    │   └── img/                     # source images (processed by Hugo Pipes)
    ├── static/
    │   ├── _headers                 # Cloudflare Pages response headers (CSP, HSTS, etc.)
    │   ├── favicon.ico, site.webmanifest, etc.
    ├── resources/                    # Hugo's generated/cached asset pipeline output
    ├── public/                       # build output (gitignored, rebuilt by Cloudflare on deploy)
    ├── .gitmodules                   # declares themes/blowfish as a submodule
    └── themes/
        └── blowfish/                 # vendored Hugo theme (Tailwind CSS-based)
            └── scripts/
                ├── package.json
                ├── package-lock.json
                └── seed-firebase-views.js   # manual GA→Firestore view-count backfill script
```

## Thumbnails

Every page should have a `feature.*` image in its folder (page bundle).
The theme uses it for list cards, related posts, link previews and,
unless `showHero: false`, as a banner on the page. Cards display it at
**3:2**, so make thumbnails 1500x1000 and keep the subject centred.

Pages without a suitable image get a **text title card**, generated from
front matter so it can always be rebuilt from the repo:

```yaml
thumbnailCard:
  kicker: "Self-Hosting Palworld · Part 1"
  title: ["Foundation and", "Digging In"]   # one string or a list of lines (max ~24 chars each)
  subtitle: "Proxmox, LinuxGSM, and the config traps"
showHero: false   # the card repeats the title, so don't show it as a banner
```

```sh
cd zachleinfo
python3 scripts/thumbnail-card.py                        # render any missing cards
python3 scripts/thumbnail-card.py --all                  # re-render every card
python3 scripts/thumbnail-card.py content/about/index.md # one page
```

Needs `ffmpeg` and PyYAML. Fonts are committed in `scripts/fonts/` (DejaVu,
see its license file), so cards look the same on any machine. Keep card
text evergreen: no job titles, counts, or dates that will go stale.

Builds warn about thumbnail problems (visible in Cloudflare build logs):

- `THUMBNAIL MISSING`: a page has no feature image.
- `THUMBNAIL REVIEW DUE`: a page's `thumbnailReview: YYYY-MM-DD` date has
  passed. Use it for images that can go out of date (for example an
  architecture diagram), with a `thumbnailReviewNote` saying what to check.

## Status page and uptime monitor

`/status` shows uptime bars from the `zachle-status` Cloudflare Worker
(`status-worker/` at the repo root), which checks the site every 5
minutes and serves history at `https://zachle.info/api/status`. See
`status-worker/README.md` to redeploy it.
