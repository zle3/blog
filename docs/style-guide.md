# Style guide

How text on zachle.info reads. The hard rules (honesty, privacy, Oxford commas) are in [../AGENTS.md](../AGENTS.md); this file is about voice and wording. When in doubt, read two existing pages of the same type before writing and match them.

Reference pages:

- Blog voice: `content/blog/2026/20260710/` (Palworld, Part 1), the rest of that series, and `content/blog/2026/20261122/` (a short standalone post).
- Portfolio voice: `content/portfolio/2026/202611-community-platform/` and `202607-palworld/`.

## Blog posts: a first-person build log

Blog posts are written as the owner, in the first person, telling the story of building or fixing something. Casual, a little wry, and honest about what went wrong. They are **not** written like a resume, a press release, product documentation, or a tutorial.

What that sounds like:

- **First person, past tense, conversational.** "I drafted a whole `qm create` script to fully automate the VM build. Then I didn't use it."
- **Self-deprecating asides.** "Before spinning up anything I sat down and actually thought about the shape of the whole thing, which, if you know me, is not always my first instinct."
- **Long, comma-joined sentences** that run the way someone talks, broken up by short flat ones. "It works for me. It does not work for anyone else, because nobody else has my setup."
- **"Lesson learned" beats.** Each problem gets what I expected, what actually happened, how I found it, and what I do differently now. Posts usually end on what the whole thing taught me, not on a summary of features.
- **Real errors in code blocks.** When something failed, show the actual error text, command, or config in a fenced code block with a language tag. Never invent or "clean up" an error message. Trim it, and replace anything private.
- **Wry headings in sentence case.** "Planning, or: the part where I pretend I have foresight", "Backups that leave the building", "The four bugs that nearly ate it".
- **Plain words.** Explain a term the first time it shows up. Write for a curious reader who has not seen the project.

What to avoid:

- Resume or marketing language: "leveraged", "spearheaded", "robust", "seamless", "cutting-edge", "passionate", "delivered a scalable solution".
- Stock AI phrasing: "delve", "in today's fast-paced world", "it's worth noting", "in conclusion", "game-changer", "not just X, but Y" used as a tic.
- Emoji, exclamation-mark enthusiasm, and rhetorical hype.
- Bulleted feature lists in place of the story. Lists and tables are for settings, options, and comparisons.
- Em dashes and en dashes (the checker rejects them).
- A "Conclusion" or "Introduction" heading. Open with the situation, close with where it landed.

Shape of a post:

- Body starts with a `##` heading. Never use `#`; the page title is the only H1.
- Standalone posts run as long as the story needs (the PC Reinstall Kit post is about 1,500 words).
- **Series parts run about 3,000 words each.** If a part is heading past 5,000, split it. The first part says what the series covers; later parts open with one line placing the reader, and may end by pointing at what comes next.
- When AI agents did the building, say so early and plainly, in the post's own words (see the honesty rules). The usual framing: "I decide what it should do, Claude writes the code, and I test it on a real PC and complain."
- If the code is private, say once that the repos are private and still in development, so there is nothing to link.
- If screenshots use demo data, made-up names, or composites, say how they were made, once near the top or in each caption.

## Portfolio entries: plainer and more structured

Portfolio entries are showcases a hiring manager might read. Still first person and still honest, but more formal than the blog: fewer jokes, shorter sentences, and clear sections. Not a resume bullet list either; full sentences that explain what the thing is and why it matters.

Typical sections (use the ones that fit, in roughly this order):

`## What this is` · `## By the numbers` · `## What it does` · `## Architecture` · `## How it's run` · `## Infrastructure and security` · `## Challenges, briefly` · `## Timeline` · `## Tech stack` · `## Where it stands`

- Open with one paragraph: what it is, who it is for, what it is made of.
- Link the blog post or series that tells the full story, with root-relative links.
- Link the source only if the repository is public and listed in `data/vocabulary.yaml`. Otherwise: "The repos are private and still in active development, so there's no source link this time."
- Numbers go in "By the numbers" with enough context to check them (a date range, what was counted).
- The 2026 entries run roughly 1,100 to 1,700 words; stay in that range.

## Top-level pages

`/now` is a short bulleted list in the first person: bold lead-in, one sentence each. `/about` is first person and the most formal page on the site. Keep both factual; no jokes needed.

## Wording rules for everything

- **Oxford commas**, always: "a desktop app, a members website, and a Discord bot".
- **No em or en dashes.** Commas, colons, parentheses, or two sentences.
- **American spelling** ("color", "behavior", "organize"), matching the existing pages.
- **Numbers**: digits with thousands separators ("1,153 deaths", "about 3,000 words"), "%" written as "percent" or "14%" consistently within a page, units spelled the way the existing pages do ("16 to 20GB RAM", "5 m", "400 ms"). Ranges use "to", not a dash.
- **Approximations are marked**: "about", "roughly", "~200-member". Never drop the qualifier from a number that had one in the source.
- **Titles in Title Case**, headings inside the page in sentence case.
- **Product names as their owners write them**: Proxmox, LinuxGSM (LGSM), Claude Code, Cloudflare Tunnel, discord.py, PowerShell, SQLite.
- **Links**: pages on this site use root-relative paths (`/blog/2026/pc-reinstall-kit`), never `https://zachle.info/...`. Link text says where the link goes; no "click here".
- **Code**: inline code for commands, file names, settings, and identifiers; fenced blocks with a language tag for anything longer than a line.

## Summary, description, and keywords

Three front matter strings, three jobs:

- `summary` is shown on cards and lists. It can carry the post's voice: "I was helping someone reinstall a corrupted Windows install and got tired of the usual \"wait, what did you have installed?\" dance, so I built a free two-part kit..."
- `description` is for search engines and link previews. Neutral, factual, one or two sentences. Series parts start with "Part N of a series on ...".
- `keywords` is one lowercase, comma-separated string of search phrases: `"palworld, lgsm, proxmox, homelab, self-hosted game server"`.

All three follow the hard rules: no unverified numbers, no private names.

## Images and captions

Covered in [images.md](images.md). In short: every image has alt text that describes what is shown, captions can carry a little voice ("It really wants you to pick the USB stick."), and anything composite, re-created, or filled with demo data says so.
