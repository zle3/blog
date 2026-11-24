# The content checker

`zachleinfo/scripts/check-content.py` encodes the conventions so that a contributor with no context cannot drift from them. `scripts/verify.sh` runs it and then a full Hugo build.

```sh
cd zachleinfo
bash scripts/verify.sh                       # the normal command: checker + build, fails on any Hugo warning
python3 scripts/check-content.py             # checker only
python3 scripts/check-content.py --strict    # warnings fail too
python3 scripts/check-content.py --no-git    # skip the comparisons with git history
```

Needs Python 3 and PyYAML (`pip install pyyaml`), and Hugo extended for `verify.sh`. Output is one line per finding:

```
content/blog/2026/20261201/index.md: ERROR [taxonomy] tag 'vlan' is not in data/vocabulary.yaml; reuse an existing tag or add it there
```

Errors fail the run. Warnings are for you to read and either fix or report.

## Rules

| Rule | What it checks | Usual fix |
|---|---|---|
| `layout` | Every page is a bundle folder with `index.md`. Blog: `content/blog/<YYYY>/<YYYYMMDD>[-N]/`. Portfolio: `content/portfolio/<YYYY>/<YYYYMM>[-slug]/`. Folder date and year match `date:`. No stray files. | Use `scripts/new-content.sh`; move media next to its `index.md`. |
| `front-matter` | YAML between `---` lines, no tabs, required keys present for the page type, no unknown keys, non-empty strings, booleans where expected. | See [front-matter.md](front-matter.md). |
| `draft` | No `draft` key. | Remove it; unfinished work stays out of the repository. |
| `placeholder` | No archetype `TODO` left in front matter or at the start of a body line. | Replace every `TODO`. |
| `date` | `date` and `lastmod` are full timestamps with a UTC offset. Warns when `date` is in the future (Hugo would skip the page). | `2026-11-22T16:00:00-08:00`. |
| `url` | Shape per page type, lowercase kebab-case, no trailing slash, year matches the date, unique across the site. Every URL that exists on `origin/main` still resolves (as a `url` or an `aliases` entry). | Never change a published `url`; add `aliases` if a page must move. |
| `taxonomy` | Tags are listed in `data/vocabulary.yaml`, no duplicates, `portfolio` first on portfolio entries and absent from blog posts; blog `categories` is exactly `["blog"]`; top-level pages carry no taxonomies. Warns outside 3 to 7 tags. | Reuse an existing tag, or add one deliberately ([vocabulary.md](vocabulary.md)). |
| `series` | Series name is registered; `series_order` is a whole number; title, description, URL, and card kicker follow the series patterns; parts number 1..n with no gaps; each part is dated after the previous one. Warns under 2,400 words. | Follow the "New series part" checklist. |
| `thumbnail` | Every page has `thumbnailCard` and `showHero: false`. Exactly one `feature.webp`, a 1500x1000 WebP. The card has `kicker`, `title` (lines of 24 characters or fewer), and `subtitle` or `image`, plus `focus` and `fit` with allowed values. `thumbnailReview` is a date with a note. | Add or fix the card, then run `scripts/thumbnail-card.py`. |
| `brand` | Warning: a WebP in a new bundle (not `feature.webp`, not the resume pages) has a light background. | Redraw it on the brand canvas or run `scripts/brand-recolor.py` ([brand.md](brand.md)). If it is a plain screenshot of a light-themed app, leave it and say so in your report. |
| `broken-image` | Every referenced image, carousel slide, video, and poster exists in the bundle with the exact same letter case. | Add the file or fix the reference. |
| `overview` | Every blog and portfolio post has an `ai-overview.yaml`: valid YAML with `overviews` (2 to 5 strings) and `followups` (1 to 5, each with a `question` and a list of `answers`), and no dashes. Warns on chip questions over 60 characters. | Write or fix it ([ai-overview.md](ai-overview.md)). |
| `new-vocabulary` | Warning: a tag, series, category, or public repo in `data/vocabulary.yaml` is not on `origin/main` yet. | Tell the owner in your report under "Needs your attention". |
| `image` | Alt text present; every carousel slide has a caption; no hotlinked media. For new bundles: WebP only, lowercase kebab-case file names, images under 1 MB and video under 8 MB. Warns about files nothing references. | Convert, rename, add alt text, or delete the unused file. |
| `style` | No em or en dashes; no `#` H1 headings in the body. | Rephrase; start headings at `##`. |
| `link` | Links to this site are root-relative and point at an existing page `url`. | `/blog/2026/pc-reinstall-kit`, not `https://zachle.info/...`. |
| `privacy` | No 17 to 20 digit numbers (Discord and account IDs); no email addresses other than the public contact address or `example.com`; no links to `github.com/zle3/<repo>` unless the repo is under `public_repos`. | Remove it or use a made-up placeholder. Private repos are not linked. |
| `lastmod` | A page that has `lastmod` and whose body differs from `origin/main` has a new `lastmod`. | Set `lastmod` to today. |

Bundles dated before 2026-11-01 keep their original PNG and JPG images and file names; the image format, naming, and size rules apply to everything newer and to top-level pages.

## What it cannot check

The checker is a floor, not a review. It cannot tell whether a number is verified, whether the text claims hand-written code, whether an image is an unlabelled composite, whether a screenshot shows a real person's name, whether security detail is too specific, whether the voice is right, or whether a list is missing its Oxford comma. Those are on you; re-read your work against the hard rules in [../AGENTS.md](../AGENTS.md).

## Hugo build warnings

`verify.sh` also fails on warnings from the build itself. The site's own are:

- `THUMBNAIL MISSING`: a page has no feature image.
- `AI OVERVIEW MISSING`: a blog or portfolio post has no `ai-overview.yaml`.
- `THUMBNAIL REVIEW DUE`: a page's `thumbnailReview` date has passed. This one is shown but does not fail `verify.sh`. If it is your page, check the image and move the date. If it is not, leave it and report it.

## Cloudflare builds

`build.sh` runs `check-content.py --no-git --deploy` on every Cloudflare build (installing PyYAML if the image lacks it). In this mode errors are split in two:

- **Minor** (rules `style`, `image`, `thumbnail`, `lastmod`, `overview`): printed in the build log, the deploy goes ahead.
- **Major** (every other rule: `front-matter`, `layout`, `draft`, `placeholder`, `date`, `url`, `taxonomy`, `series`, `broken-image`, `privacy`, `link`): the build fails and Cloudflare keeps serving the last good deploy. The checker marks these `ERROR (major, blocks deploy)`.

The split lives in `MINOR_RULES` in `scripts/check-content.py`. Locally, `verify.sh` still fails on every error, minor or major: minor is a deploy safety valve, not permission to leave the problem.

## Changing the rules

The checker, the vocabulary, the archetypes, and these docs describe the same conventions and must change together. Contributors adding content do not edit the checker. If a rule is wrong for a legitimate case, stop and ask the owner.
