# Contributing to zachle.info (for AI agents and humans)

This repository is Zach Le's personal site, [zachle.info](https://zachle.info): a Hugo site on the Blowfish theme, deployed by Cloudflare Pages from `main`. Agents from many unrelated projects add to it without sharing context. This file is the single source of truth for how to do that. Read it fully before you change anything, then open the checklist for your kind of change.

**Pushing to `main` deploys the live site.** Nothing here is a draft space.

## The short version

1. Work inside `zachleinfo/` (the Hugo root). Start new pages with `bash scripts/new-content.sh`, never by copying an old post.
2. Follow the checklist for your contribution type in [docs/checklists.md](docs/checklists.md).
3. Write in the voice described in [docs/style-guide.md](docs/style-guide.md) and obey the hard rules below.
4. Run `bash zachleinfo/scripts/verify.sh` until it prints `verify: OK`.
5. Do not push. Start the local preview, give the owner the links, and wait for approval (see [Git and publishing](#git-and-publishing)).

## Hard rules

These apply to every page, caption, thumbnail, and commit message. If your source material conflicts with one of them, the rule wins; ask the owner instead of guessing.

**Honesty**

- **Verified numbers only.** Every count, percentage, date, price, and duration must come from something you can point to (a log, a changelog, a test run, a dashboard, the owner's own statement). No estimates presented as facts, no rounding up. If you cannot verify it, leave it out or say plainly that it is approximate.
- **Say who wrote the code.** If AI agents wrote it, say so. Never state or imply that the owner hand-wrote code that agents wrote. The honest framing used across the site: the owner sets direction and rules, tests, reviews, and approves; the agents write the code.
- **Label anything that is not a plain capture.** Composite, re-created, illustrative, or demo-data images and videos say so in the caption or alt text ("Composite: ...", "demo data", "made-up names").
- **Keep numbers consistent across the site.** A figure that appears in a post often also appears on the homepage, `/about`, `/now`, or a portfolio entry. Search `content/` before you state or change one.

**Privacy and security**

- **No personal information beyond what the site already publishes.** Already public: the owner's name, Sacramento, CA, `hello@zachle.info`, the profile links in `config/_default/languages.en.toml`, and what `/about`, `/now`, and the resume say. Do not add addresses, phone numbers, employer-internal details, family or friends' names, real floor plans, camera positions, or anything similar.
- **No private people.** No real member names, usernames, avatars, Discord or account IDs, or message contents from private communities. Screenshots use demo data or made-up names, and say so.
- **Private repositories are "still in development".** Describe them that way and do not link to them or name their URLs. Only repositories listed under `public_repos` in `zachleinfo/data/vocabulary.yaml` may be linked.
- **Security, protocol, and reverse-engineering topics stay high level.** Describe the idea and the lesson, not a recipe: no packet formats, offsets, keys, opcodes, internal hostnames, IP addresses, ports of live services, firewall rule dumps, or steps someone could replay against a game, a service, or the owner's network.
- **No secrets.** No tokens, keys, passwords, webhook URLs, or `.env` contents, including in screenshots and code blocks.

**Consistency**

- **Oxford commas everywhere**: prose, front matter, captions, title cards, and commit messages ("apps, settings, and browser data").
- **No em dashes or en dashes.** Use commas, colons, parentheses, or a new sentence.
- **One brand for every image.** Thumbnails are always generated from `thumbnailCard` front matter by `scripts/thumbnail-card.py`. Diagrams, charts, labels, and burned-in captions use the palette in `zachleinfo/data/brand.yaml`: plum canvas, no light backgrounds, no blue, green, or orange, and rose and mauve for bad and good. Text in images must be readable at 1080p. Plain screenshots are never recoloured. See [docs/brand.md](docs/brand.md).
- **Controlled vocabulary.** Tags, categories, and series names come from `zachleinfo/data/vocabulary.yaml` ([docs/vocabulary.md](docs/vocabulary.md)).
- **Published URLs never change.** If a page must move, keep the old path under `aliases`.
- **Stay in your lane.** Do not edit other pages, the theme (`themes/blowfish/`), layouts, CSS, config, or `static/_headers` as part of a content contribution. If you think one needs changing, tell the owner.

## Where things go

| You want to | Do this | Details |
|---|---|---|
| Write a blog post | `bash scripts/new-content.sh blog` | [checklist](docs/checklists.md#new-blog-post) |
| Add a part to a series, or start one | `bash scripts/new-content.sh series-part` | [checklist](docs/checklists.md#new-series-part) |
| Add a portfolio entry | `bash scripts/new-content.sh portfolio <slug>` | [checklist](docs/checklists.md#new-portfolio-entry) |
| Update `/now` | edit `content/now/index.md`, bump `lastmod` | [checklist](docs/checklists.md#update-now) |
| Mention something on the homepage or `/about` | edit `content/_index.md` or `content/about/index.md` | [checklist](docs/checklists.md#homepage-or-about-mention) |
| Touch the status page, resume, or privacy page | ask the owner first | [checklist](docs/checklists.md#status-resume-and-privacy-pages) |

Commands run from `zachleinfo/`. Layout of a page:

```
zachleinfo/content/
  _index.md                         homepage text
  about/ now/ resume/ privacy/ status/    one bundle each: index.md + feature.webp
  blog/<YYYY>/<YYYYMMDD>[-N]/       one folder per post: index.md, feature.webp, images
  portfolio/<YYYY>/<YYYYMM>-<slug>/ one folder per entry: index.md, feature.webp, images
```

Every page is a folder (a Hugo page bundle) holding `index.md`, a `feature.webp` thumbnail, an `ai-overview.yaml` (blog and portfolio posts), and the media that page uses. The folder name is a date, not the URL; the URL comes from `url:` in front matter.

Reference docs, all in [docs/](docs/):

- [style-guide.md](docs/style-guide.md): voice for blog and portfolio, wording rules, what to label
- [front-matter.md](docs/front-matter.md): every key, per page type, with examples
- [images.md](docs/images.md): thumbnails, title cards, screenshots, carousels, video
- [brand.md](docs/brand.md): the palette, generated thumbnails, diagram style, recolour tools, readability
- [ai-overview.md](docs/ai-overview.md): the pre-written "AI Overview" panel every post needs
- [vocabulary.md](docs/vocabulary.md): tags, categories, series, and how to add one
- [checklists.md](docs/checklists.md): step-by-step per contribution type
- [checker.md](docs/checker.md): what `check-content.py` enforces and how to fix each finding

## Verify before you finish

```sh
cd zachleinfo
bash scripts/verify.sh
```

This runs `python3 scripts/check-content.py` (front matter, vocabulary, folder names, thumbnails, links, privacy lints) and then a full `hugo` build into a temporary folder, and fails on any error or Hugo warning. It needs Hugo extended (the version pinned in `build.sh`), Python 3, and PyYAML. It does not deploy or touch `public/`.

- Fix every `ERROR`. Do not weaken the checker, add exemptions, or edit the vocabulary just to get past it. A new tag or series is a deliberate, reported decision ([docs/vocabulary.md](docs/vocabulary.md)).
- Read every `WARN` and either fix it or mention it in your report.
- On Cloudflare the same checker runs in deploy mode: major errors (broken pages, URLs, vocabulary, privacy) fail the deploy, minor ones (style, images, thumbnails) only log. That is a safety net, not a reason to push with minor errors ([docs/checker.md](docs/checker.md#cloudflare-builds)).
- The checker cannot judge honesty, voice, or Oxford commas. Re-read your text against the hard rules yourself.
- If the checker reports problems in files you did not touch, leave them alone and mention them in your report: another agent may be working in the same folder.

## Git and publishing

**Never push without the owner's review of the local build.** Pushing is deploying: Cloudflare Pages builds `main` and publishes it within minutes.

Before any push, stop and do this:

1. `bash scripts/verify.sh` passes.
2. Start the local preview from `zachleinfo/` and leave it running:

   ```sh
   hugo server --bind 127.0.0.1 --port 1313
   ```

3. Give the owner the local URL of every page you added or changed: `http://localhost:1313` plus the page's `url`, for example `http://localhost:1313/blog/2026/pc-reinstall-kit/`. Include `http://localhost:1313/` and the section list (`/blog/` or `/portfolio/`) when a new card appears there.
4. Wait for the owner's explicit approval. Silence is not approval. An approval covers what was shown; if you change content afterwards, ask again.

Only two exceptions: the owner explicitly tells you to skip the review, or the owner states they are remote and cannot view a local build. Then you may push once `verify.sh` passes, and your report must say that the review was skipped and why.

Other rules:

- **Commit only if your owner allows commits**, and never push or deploy on your own initiative. If unsure, leave the changes uncommitted and say so.
- **Commit only your own files.** Other agents may have uncommitted work in this folder. Stage paths by name (`git add zachleinfo/content/blog/2026/20261201`), never `git add -A` or `git commit -a`, and never revert, stash, or "clean up" changes you did not make.
- No force pushes, no history rewrites, no branch or remote changes, no edits to Cloudflare or DNS settings.
- Commit message style (from `git log`): one imperative, sentence-case subject line with no trailing period, saying what changed on the site. Add a body only when the change needs explaining. End with a `Co-Authored-By:` trailer naming the model that did the work.

  ```
  Add blog post: PC Reinstall Kit

  Co-Authored-By: <model name> <noreply@anthropic.com>
  ```

  Other subjects from the log: `Update /now with CSI contract role and add kotone.dev to /now and homepage`, `Add Oxford commas across site content and title cards`. One contribution, one commit; do not mix unrelated pages.

## Your report to the owner

Start the report with a **Needs your attention** section whenever you added a tag, category, or series to `data/vocabulary.yaml`, or anything else the owner must decide (the checker's `new-vocabulary` warning reminds you). New tags and series do not need approval first, but the owner must always be told; never bury them in the body of the report.

Then a short report: pages added or changed (with local preview URLs), any tag or series you added to the vocabulary, any number you could not verify and left out, every image that is composite or demo data, checker warnings you did not fix, and whether you committed. If the review was skipped, say so and why.
