# Front matter reference

All content uses **YAML** front matter between `---` lines. Start from an archetype (`bash scripts/new-content.sh ...`) so the keys and their order are right, then replace every `TODO`. `scripts/check-content.py` rejects unknown keys, so a typo such as `Tags:` or `serie:` fails instead of being silently ignored.

Keys appear in the order shown here.

## Blog post

```yaml
---
title: "PC Reinstall Kit: A USB Stick That Remembers Your Whole PC"
date: 2026-11-22T16:00:00-08:00
tags: ["windows", "powershell", "claude-code", "tools"]
categories: ["blog"]
summary: "One or two sentences in the post's voice, shown on cards."
description: "One neutral sentence for search engines and link previews."
keywords: "windows reinstall, winget, powershell, usb, claude code"
url: "/blog/2026/pc-reinstall-kit"
showHero: false
---
```

## Series part

The same as a blog post, plus `series` and `series_order`, with a fixed title, description, and URL pattern taken from the series entry in `data/vocabulary.yaml`:

```yaml
---
title: "Self-Hosting Palworld, Part 2: Bot and Backups"
date: 2026-07-13T14:00:00-07:00
tags: ["homelab", "palworld", "discord", "linux"]
categories: ["blog"]
series: ["small community self-hosted game server"]
series_order: 2
summary: "..."
description: "Part 2 of a series on self-hosting a Palworld dedicated server: ..."
keywords: "palworld, discord.py, lgsm, homelab"
url: "/blog/2026/self-hosted-palworld-part-2"
showHero: false
thumbnailCard:
  kicker: "Self-Hosting Palworld · Part 2"
  title: ["Bot and Backups"]
  subtitle: "Restart-vote bot and offsite NAS backups"
---
```

## Portfolio entry

No `categories`, no `series`. The first tag is always `portfolio`.

```yaml
---
title: "Self-Hosted Palworld Server Platform"
date: 2026-07-14T18:00:00-07:00
tags: ["portfolio", "palworld", "docker", "homelab", "discord"]
summary: "..."
description: "..."
keywords: "palworld, lgsm, proxmox, docker, discord bot, homelab"
url: "/portfolio/2026/palworld-server-showcase"
showHero: false
thumbnailCard:
  kicker: "Portfolio"
  title: ["Self-Hosted", "Palworld Server"]
  subtitle: "Proxmox, LinuxGSM, a Discord bot, and backups"
---
```

## Keys

| Key | Applies to | Rule |
|---|---|---|
| `title` | all | Title Case. Series parts: `<title_prefix>, Part N: <Subtitle>`. |
| `date` | all | Full timestamp with UTC offset, unquoted: `2026-11-22T16:00:00-08:00`. The owner is in US Pacific time (`-08:00` in winter, `-07:00` in summer). Must not be in the future, or Hugo skips the page. Never change the date of a published page. |
| `lastmod` | `/now`, `/about`, edited posts | Same format. Bump it whenever the body changes on a page that has it. Add it when you make a substantive edit to an old post. |
| `tags` | blog, portfolio | 3 to 7, from `data/vocabulary.yaml`. Portfolio: `portfolio` first. |
| `categories` | blog only | Exactly `["blog"]`. |
| `series` | series parts | One-item list with the exact name from `data/vocabulary.yaml`. |
| `series_order` | series parts | Whole number, starting at 1, no gaps or repeats within a series. |
| `summary` | all | Card text. See the style guide. |
| `description` | all | Meta description. Series parts start `Part N of a series ...`. |
| `keywords` | blog, portfolio | One lowercase comma-separated string. Omit the key on top-level pages. |
| `url` | all | The permanent address. Blog: `/blog/<year>/<kebab-slug>`; series parts: `/blog/<year>/<url_slug>-part-N`; portfolio: `/portfolio/<year>/<kebab-slug>`. Lowercase, no trailing slash, year equal to the date's year. Never change it once pushed. |
| `aliases` | all | List of old paths that should keep working, if a page ever has to move. |
| `showHero` | all | `false` hides the thumbnail as a banner at the top of the page. Required when the thumbnail is a title card. For a real image, leave the key out to show the banner, or set `false` if the same image already appears in the body. |
| `thumbnailCard` | all | Text for a generated title card: `kicker`, `title` (a string or a list of lines, 24 characters per line at most), `subtitle`. See [images.md](images.md). |
| `thumbnailReview`, `thumbnailReviewNote` | all | `YYYY-MM-DD` plus a note, for a thumbnail that can go out of date (a diagram, a screenshot with numbers). Builds warn once the date passes. |
| `showRelatedContent`, `showTableOfContents` | all | Optional booleans; only top-level pages set them today. Leave them out of posts. |
| `showDate`, `showDateUpdated`, `showReadingTime`, `showWordCount`, `showViews`, `showLikes`, `showAuthor`, `sharingLinks`, `firebasePath` | top-level pages only | Existing page settings. `firebasePath` keeps the view and like counters of pages that were moved into bundles; never change or remove it. |

Not allowed: `draft` (unfinished work does not belong in the repository's `main`), TOML front matter (`+++`), tab characters, and any key not in this table.

## Folder names

| Type | Folder | Notes |
|---|---|---|
| Blog post | `content/blog/<YYYY>/<YYYYMMDD>/` | The date in `date:`. A second post on the same day is `<YYYYMMDD>-2`, the third `-3`, and so on. |
| Portfolio entry | `content/portfolio/<YYYY>/<YYYYMM>-<slug>/` | Year and month in `date:`, plus a short kebab-case slug. |
| Top-level page | `content/<name>/` | Fixed set. New ones need the owner's approval. |

The folder name never appears in the URL. Once a page is published, do not rename its folder either: thumbnails and history are tied to it.

## Ordering posts published on the same day

Lists sort by `date`. Series parts published together step the time by one minute per part (`14:00`, `14:01`, `14:02`, ...) so they list in order; the checker requires each part to be later than the one before it.
