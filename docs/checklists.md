# Checklists

Pick the one that matches your change. Every checklist ends with the same three steps: **verify, preview for the owner, report**. Commands run from `zachleinfo/`.

Before any of them: read [../AGENTS.md](../AGENTS.md) (hard rules) and [style-guide.md](style-guide.md).

## New blog post

1. Read two existing posts for voice: `content/blog/2026/20260710/index.md` and `content/blog/2026/20261122/index.md`.
2. Gather your facts first. For every number you plan to use, note where it comes from. Drop the ones you cannot verify.
3. Scaffold: `bash scripts/new-content.sh blog`. This creates `content/blog/<YYYY>/<YYYYMMDD>/index.md` (with `-2`, `-3`, ... if a post already exists for today).
4. Fill in the front matter ([front-matter.md](front-matter.md)): Title Case title, 3 to 7 tags from `data/vocabulary.yaml`, summary, description, keywords, and a permanent `url` of the form `/blog/<year>/<kebab-slug>`.
5. Write the body in the blog voice. Start with a `##` heading. Say who wrote the code. Private repos are "still in development" and not linked.
6. Add images as WebP next to `index.md`, with alt text; label composites and demo data ([images.md](images.md)).
7. Add the thumbnail `feature.webp` (1500x1000): a real image, or `thumbnailCard` front matter plus `python3 scripts/thumbnail-card.py <path to index.md>`.
8. Re-read the whole post once against the hard rules: verified numbers, no private names or IDs, high-level security detail only, Oxford commas, no dashes.
9. Verify, preview, report (below).

Do not also edit the homepage, `/now`, or a portfolio entry unless that was part of what you were asked to do. The homepage lists recent posts automatically.

## New series part

Everything in "New blog post", with these differences:

1. Open `data/vocabulary.yaml` and find the series. Open the latest existing part to get the next `series_order` and to match how parts open and close.
2. Scaffold: `bash scripts/new-content.sh series-part`.
3. Front matter follows the series patterns exactly (the checker enforces them):
   - `title: "<title_prefix>, Part N: <Subtitle>"`
   - `series: ["<exact series name>"]` and `series_order: N`
   - `description: "Part N of a series on ..."`
   - `url: "/blog/<year>/<url_slug>-part-N"`
   - title card kicker, if used: `"<kicker> · Part N"`
4. Aim for about 3,000 words. Split rather than run long.
5. Publishing several parts at once: one folder each (`20261201`, `20261201-2`, ...), with `date` times one minute apart in part order.
6. If earlier parts or a portfolio entry list the series' parts by link, ask the owner whether to add the new part there. That is an edit to another page.

**Starting a new series** needs the owner's agreement and at least two planned parts. Register it in `data/vocabulary.yaml` ([vocabulary.md](vocabulary.md)) in the same commit, and say so in your report.

## New portfolio entry

1. Read `content/portfolio/2026/202611-community-platform/index.md` and `202607-palworld/index.md` for structure and tone.
2. Scaffold: `bash scripts/new-content.sh portfolio <kebab-slug>`. This creates `content/portfolio/<YYYY>/<YYYYMM>-<slug>/index.md`.
3. Front matter: first tag `portfolio`, then 2 to 6 more; no `categories` or `series`; `url: "/portfolio/<year>/<kebab-slug>"`.
4. Write it in the portfolio voice: plainer and more structured than the blog, with sections such as "What this is", "By the numbers", "Architecture", "Challenges, briefly", "Tech stack", and "Where it stands".
5. Link the blog post or series that tells the story (root-relative links). Link source code only for repositories under `public_repos` in `data/vocabulary.yaml`.
6. Thumbnail: an architecture diagram or screenshot (add `thumbnailReview` if it can go stale), or a title card with kicker `Portfolio`.
7. Check every number against the blog posts and `/about`. They must agree.
8. Verify, preview, report.

## Update /now

`content/now/index.md` is a short first-person list of what the owner is doing at the moment.

1. Change only the bullets you were asked to change. One bullet per item: a bold lead-in, then one sentence. Remove an item only if the owner said it is over.
2. Set `lastmod` to today (`2026-11-20T00:00:00-08:00` style). The checker fails if the body changed and `lastmod` did not.
3. Update the `description` in front matter if the list of focus areas it names has changed.
4. No private detail: employers, clients, schools, and locations appear only as the owner has already worded them or explicitly tells you to.
5. Verify, preview, report.

## Homepage or /about mention

`content/_index.md` is five short paragraphs. `content/about/index.md` is the long-form profile.

1. Only edit these when asked. A new post does not need a homepage mention; recent posts are listed automatically.
2. Homepage: add or adjust one sentence, in the same plain first-person tone, with a root-relative link. Do not let it grow into a list of projects; replace rather than append when it gets long.
3. `/about`: achievements are factual, measured statements. Every number must already be verified and must match the page it links to. Bump `lastmod`.
4. If you change the wording of a figure here, search `content/` for the same figure elsewhere and tell the owner about any mismatch instead of silently changing other pages.
5. Verify, preview, report.

## Status, resume, and privacy pages

These are owner-maintained. Do not change them as part of a content contribution.

- `/status` is driven by `layouts/shortcodes/site-status.html`, `static/js/status.js`, and the Cloudflare Worker in `status-worker/`. Changes there are code changes, not content.
- `/resume`: the owner replaces `content/resume/Zachary-Le-Resume.pdf`, then `python3 scripts/resume-images.py` regenerates the `page-N.webp` previews. The file name is part of a published URL and is checked by the status page; do not rename it.
- `/privacy` describes what the site collects. It changes only when the site's behavior changes, and only with the owner's wording.

## Editing an existing post

1. Fix what you were asked to fix. Do not restyle or rewrite around it.
2. Never change `url`, `date`, `series`, `series_order`, or the folder name of a published page.
3. For a substantive correction, add or bump `lastmod`. For a typo, leave it.
4. If you correct a number, search `content/` for the same number on other pages and report every place it appears.
5. Verify, preview, report.

## Verify, preview, report

The last three steps of every checklist.

1. **Verify**: `bash scripts/verify.sh` prints `verify: OK`. See [checker.md](checker.md) for each finding.
2. **Preview for the owner. Do not push.** Pushing deploys the live site. Start the preview and leave it running:

   ```sh
   hugo server --bind 127.0.0.1 --port 1313
   ```

   Give the owner the link to every page you added or changed (`http://localhost:1313` + the page's `url` + `/`), plus `http://localhost:1313/` and `http://localhost:1313/blog/` or `/portfolio/` if a new card appears there. Then wait for explicit approval. The only exceptions: the owner tells you to skip the review, or says they are remote and cannot view a local build. In those cases you may push after `verify.sh` passes, and you must say in your report that the review was skipped and why.
3. **Report**: pages added or changed with their preview links, vocabulary additions, numbers left out as unverifiable, images that are composite or demo data, warnings left unfixed, whether you committed (only your own files, only if allowed), and whether anything was pushed.
