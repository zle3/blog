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

## Adding content

Everything a contributor (human or AI agent) needs is in [AGENTS.md](AGENTS.md),
with reference pages in [docs/](docs/): style guide, front matter, images,
vocabulary, per-task checklists, and the checker rules. In short:

```sh
cd zachleinfo
bash scripts/new-content.sh blog                 # or: series-part | portfolio <slug>
# write the page, add feature.webp and images next to index.md
bash scripts/verify.sh                           # content checker + full Hugo build
hugo server --bind 127.0.0.1 --port 1313         # review locally before any push
```

Pushing to `main` deploys, so nothing is pushed before the local build has
been reviewed.

## File Tree

```
blog/
├── AGENTS.md                        # contributor rules (single source of truth)
├── CLAUDE.md                        # points Claude Code at AGENTS.md
├── README.md
├── docs/                            # contributor reference (not published)
├── status-worker/                   # Cloudflare Worker behind /status
└── zachleinfo/                      # Hugo site root
    ├── build.sh                     # Cloudflare Pages build command (pins Hugo)
    ├── hugo.toml                    # top-level site config (baseURL, title, theme)
    ├── config/_default/             # hugo, languages, markup, menus, module, params
    ├── archetypes/                  # front matter templates: blog, series-part, portfolio, default
    ├── data/vocabulary.yaml         # allowed tags, categories, series, and public repos
    ├── content/
    │   ├── _index.md                # homepage content
    │   ├── about/ now/ resume/      # page bundles: index.md + feature.webp (resume/ also holds the PDF)
    │   ├── privacy/ status/
    │   ├── blog/<YYYY>/<YYYYMMDD>[-N]/          # one bundle per post
    │   └── portfolio/<YYYY>/<YYYYMM>-<slug>/    # one bundle per entry
    ├── layouts/                     # site overrides of Blowfish partials and shortcodes
    ├── assets/                      # custom CSS, color scheme, JS overrides, site images
    ├── scripts/
    │   ├── new-content.sh           # scaffold a page bundle
    │   ├── check-content.py         # content conventions checker
    │   ├── verify.sh                # checker + full build; run before review
    │   ├── thumbnail-card.py        # render text title cards
    │   └── resume-images.py         # render resume page previews
    ├── static/                      # _headers (CSP, HSTS), favicons, small JS
    ├── public/ resources/           # build output and cache (gitignored)
    └── themes/blowfish/             # vendored Hugo theme
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

## Resume

`content/resume/` holds the PDF. Screens 768px and wider embed it; smaller
screens show `page-N.webp` images, since mobile browsers don't render PDFs
in an iframe. After replacing the PDF, re-render the images:

```sh
cd zachleinfo
python3 scripts/resume-images.py   # needs: pip install pypdfium2 pillow (venv OK)
```

## Status page and uptime monitor

`/status` shows uptime bars from the `zachle-status` Cloudflare Worker
(`status-worker/` at the repo root), which checks the site every 5
minutes and serves history at `https://zachle.info/api/status`. See
`status-worker/README.md` to redeploy it.
