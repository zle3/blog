# Tags, categories, and series

The allowed values live in one machine-readable file: [`zachleinfo/data/vocabulary.yaml`](../zachleinfo/data/vocabulary.yaml). The checker fails on anything that is not in it. This page explains how to choose.

## Categories

- Blog posts: exactly `categories: ["blog"]`.
- Portfolio entries and top-level pages: no categories. Portfolio entries carry the `portfolio` tag (first in the list) instead.

Do not add categories.

## Tags

- Lowercase kebab-case: `claude-code`, `server-rack`, `aion-2`.
- 3 to 7 per page. Pick the main technologies and topics a reader would browse by, not every tool mentioned.
- **Reuse before you add.** Read the whole list first. Use `homelab`, not `home-lab` or `self-hosting`; `ai`, not `llm` or `agents`; `networking` for VLANs, routing, and switches; `hardware` for specific gear.
- Add a new tag only when the page is substantially about something no existing tag covers and later pages are likely to share it. A tag used by one page is a dead-end link.
- To add one: put it in the right group in `data/vocabulary.yaml`, in the same commit as the page. No approval is needed first, but you must notify the owner: list it under **Needs your attention** at the top of your report (the checker warns `new-vocabulary` as a reminder).
- Never rename or remove an existing tag: its `/tags/<name>/` page is a published URL.

## Series

A series is a set of blog posts shown together with a "part of a series" box. Each series has an entry in `data/vocabulary.yaml`:

```yaml
series:
  "small community self-hosted game server":      # exact value for series: ["..."]
    title_prefix: "Self-Hosting Palworld"         # titles: "Self-Hosting Palworld, Part N: Subtitle"
    url_slug: "self-hosted-palworld"              # urls:   /blog/<year>/self-hosted-palworld-part-N
    kicker: "Self-Hosting Palworld"               # title card kicker: "Self-Hosting Palworld · Part N"
```

- **Adding a part**: copy the series name exactly, and use the next `series_order`. Check the latest part first; another agent may have added one.
- **Starting a series**: only when you have at least two parts planned. No approval is needed first. Add an entry with a lowercase descriptive name, a Title Case `title_prefix`, a short `url_slug`, and a short `kicker` (it shares a title-card line with "· Part N"). Notify the owner under **Needs your attention** at the top of your report.
- Never rename a series: the name is part of the `/series/<name>/` URL.

## Public repositories

`public_repos` lists the owner's repositories that may be linked (`github.com/zle3/<name>`). If your project's repository is not on the list, it is private as far as this site is concerned: describe it as still in development and do not link it. Only the owner adds to this list.
