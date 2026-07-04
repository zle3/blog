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
    │   ├── about.md
    │   ├── now.md
    │   ├── resume.md
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
