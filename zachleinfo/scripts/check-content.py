#!/usr/bin/env python3
"""Check content/ against the site's conventions (see ../AGENTS.md and ../docs/).

Usage (from the zachleinfo/ folder):
    python3 scripts/check-content.py            # check everything
    python3 scripts/check-content.py --strict   # warnings also fail
    python3 scripts/check-content.py --no-git   # skip checks that compare with git
    python3 scripts/check-content.py --deploy   # Cloudflare mode: only major errors fail

Exit code 0 when there are no errors, 1 otherwise. Warnings never fail the
run unless --strict is given. With --deploy (used by build.sh on Cloudflare),
only errors from major rules fail; minor-rule errors (MINOR_RULES) are
printed but let the deploy through. Needs PyYAML only. Allowed tags, categories,
series, and public repos live in data/vocabulary.yaml.

Every finding is printed as:  <file>: ERROR|WARN [rule] message
The rule names are explained in docs/checker.md.
"""
import argparse
import datetime
import pathlib
import re
import struct
import subprocess
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
VOCAB = ROOT / "data/vocabulary.yaml"

# Bundles dated before this keep their original PNG/JPG images and file
# names. Everything newer (and every top-level page) follows the image rules.
LEGACY_BEFORE = "20261101"
FEATURE_SIZE = (1500, 1000)
MAX_CARD_LINE = 24
MAX_IMAGE_BYTES = 1_000_000
MAX_VIDEO_BYTES = 8_000_000
SERIES_MIN_WORDS = 2400

COMMON_KEYS = {
    "title", "date", "lastmod", "summary", "description", "keywords", "url", "aliases",
    "showHero", "showRelatedContent", "showTableOfContents", "thumbnailCard",
    "thumbnailReview", "thumbnailReviewNote",
}
POST_KEYS = COMMON_KEYS | {"tags", "categories", "series", "series_order"}
PAGE_KEYS = COMMON_KEYS | {
    "showDate", "showDateUpdated", "showReadingTime", "showWordCount", "showViews",
    "showLikes", "showAuthor", "sharingLinks", "firebasePath",
}
REQUIRED = {
    "blog": ["title", "date", "tags", "categories", "summary", "description", "keywords", "url"],
    "portfolio": ["title", "date", "tags", "summary", "description", "keywords", "url"],
    "page": ["title", "date", "summary", "description", "url"],
}
NAMES = {"blog": "blog post", "portfolio": "portfolio entry", "page": "top-level page"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$")
SLUG = r"[a-z0-9]+(?:-[a-z0-9]+)*"
FILE_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+$")
RASTER = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tif", ".tiff"}

# Errors from these rules are cosmetic: they fail verify.sh locally but do
# not block a Cloudflare deploy (--deploy). Every other rule is major and
# blocks the deploy: broken pages, bad URLs, vocabulary, privacy, and so on.
MINOR_RULES = {"style", "image", "thumbnail", "lastmod"}

findings = []


def report(level, path, rule, msg):
    rel = path.relative_to(ROOT) if isinstance(path, pathlib.Path) else path
    findings.append((level, str(rel), rule, msg))


def err(path, rule, msg):
    report("ERROR", path, rule, msg)


def warn(path, rule, msg):
    report("WARN", path, rule, msg)


def split_front_matter(text):
    """Return (raw front matter, body) or (None, text)."""
    m = re.match(r"^---[ \t]*\n(.*?)\n---[ \t]*\n?(.*)$", text, re.S)
    return (m.group(1), m.group(2)) if m else (None, text)


def webp_size(path):
    """Width and height of a WebP file, or None if it is not a WebP."""
    with open(path, "rb") as fh:
        head = fh.read(32)
    if len(head) < 30 or head[:4] != b"RIFF" or head[8:12] != b"WEBP":
        return None
    kind = head[12:16]
    if kind == b"VP8 ":
        w, h = struct.unpack("<HH", head[26:30])
        return w & 0x3FFF, h & 0x3FFF
    if kind == b"VP8L":
        bits = struct.unpack("<I", head[21:25])[0]
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if kind == b"VP8X":
        w = int.from_bytes(head[24:27], "little") + 1
        h = int.from_bytes(head[27:30], "little") + 1
        return w, h
    return None


def prose_only(body):
    """Body with fenced code, inline code, and URLs blanked out (line count kept)."""
    out, fence = [], None
    for line in body.split("\n"):
        m = re.match(r"^\s*(```+|~~~+)", line)
        if m:
            if fence is None:
                fence = m.group(1)[0]
            elif m.group(1)[0] == fence:
                fence = None
            out.append("")
            continue
        out.append("" if fence else line)
    text = "\n".join(out)
    text = re.sub(r"`[^`\n]*`", "`code`", text)
    text = re.sub(r"\]\([^)\s]*", "](", text)
    text = re.sub(r"https?://\S+", "URL", text)
    return text


def git(*args):
    try:
        r = subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return r.stdout if r.returncode == 0 else None


class Page:
    def __init__(self, path):
        self.path = path
        self.dir = path.parent
        rel = path.relative_to(CONTENT).parts
        self.kind = rel[0] if rel[0] in ("blog", "portfolio") else "page"
        self.rel = rel
        self.text = path.read_text(encoding="utf-8")
        self.raw, self.body = split_front_matter(self.text)
        self.fm = {}
        self.legacy = False

    # -- front matter ------------------------------------------------------
    def load(self):
        p = self.path
        if self.raw is None:
            err(p, "front-matter", "file must start with YAML front matter between --- lines (not TOML +++)")
            return False
        if "\t" in self.raw:
            err(p, "front-matter", "tab character in front matter; use spaces")
        try:
            self.fm = yaml.safe_load(self.raw.replace("\t", " ")) or {}
        except yaml.YAMLError as e:
            err(p, "front-matter", f"front matter is not valid YAML: {str(e).splitlines()[0]}")
            return False
        if not isinstance(self.fm, dict):
            err(p, "front-matter", "front matter must be a YAML mapping")
            self.fm = {}
            return False
        return True

    def raw_value(self, key):
        m = re.search(rf"^{key}:[ \t]*(\S+)[ \t]*$", self.raw or "", re.M)
        return m.group(1).strip("\"'") if m else None


def check_layout(page):
    """Folder and file naming."""
    p, rel = page.path, page.rel
    if page.kind == "page":
        if len(rel) != 2 or rel[1] != "index.md":
            err(p, "layout", "top-level pages are bundles: content/<name>/index.md")
        return
    want = ("content/blog/<YYYY>/<YYYYMMDD>[-N]/index.md" if page.kind == "blog"
            else "content/portfolio/<YYYY>/<YYYYMM>[-slug]/index.md")
    if len(rel) != 4 or rel[3] != "index.md":
        err(p, "layout", f"expected {want}")
        return
    year, folder = rel[1], rel[2]
    pat = r"^(\d{8})(?:-([2-9]|[1-9]\d+))?$" if page.kind == "blog" else rf"^(\d{{6}})(?:-{SLUG})?$"
    m = re.match(pat, folder)
    if not re.match(r"^\d{4}$", year) or not m:
        err(p, "layout", f"expected {want} (blog suffix -2, -3, ... only for a second, third, ... post on the same day)")
        return
    stamp = m.group(1)
    page.legacy = stamp.ljust(8, "0") < LEGACY_BEFORE
    if not stamp.startswith(year):
        err(p, "layout", f"folder {folder} does not belong under year {year}")
    date = page.raw_value("date") or ""
    if DATE_RE.match(date) and date.replace("-", "")[: len(stamp)] != stamp:
        err(p, "layout", f"folder name {folder} does not match date {date[:10]} in front matter")


def check_front_matter(page, vocab):
    p, fm, kind = page.path, page.fm, page.kind
    allowed = POST_KEYS if kind != "page" else PAGE_KEYS
    for key in fm:
        if key == "draft":
            if fm[key]:
                err(p, "draft", "draft: true left in front matter; remove it (drafts are never built or deployed)")
            else:
                err(p, "front-matter", "remove the draft key; published pages do not carry it")
        elif key not in allowed:
            err(p, "front-matter", f"unknown key '{key}' for a {NAMES[kind]} (see docs/front-matter.md; check spelling and case)")
    for key in REQUIRED[kind]:
        if key not in fm:
            err(p, "front-matter", f"missing required key '{key}'")
    for key in ("title", "summary", "description", "keywords", "url", "thumbnailReviewNote"):
        if key in fm and (not isinstance(fm[key], str) or not fm[key].strip()):
            err(p, "front-matter", f"'{key}' must be a non-empty string (remove the key if it does not apply)")
    for key in ("showHero", "showRelatedContent", "showTableOfContents"):
        if key in fm and not isinstance(fm[key], bool):
            err(p, "front-matter", f"'{key}' must be true or false")
    for key, val in fm.items():
        for s in ([val] if isinstance(val, str) else val if isinstance(val, list) else []):
            if isinstance(s, str) and re.search(r"\bTODO\b", s):
                err(p, "placeholder", f"'{key}' still contains an archetype TODO placeholder")

    # dates
    for key in ("date", "lastmod"):
        raw = page.raw_value(key)
        if key in fm and not (raw and DATE_RE.match(raw)):
            err(p, "date", f"'{key}' must look like 2026-11-22T16:00:00-08:00 (full timestamp with UTC offset, unquoted)")
    raw = page.raw_value("date")
    if raw and DATE_RE.match(raw):
        when = datetime.datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if when > datetime.datetime.now(datetime.timezone.utc):
            warn(p, "date", f"date {raw} is in the future; Hugo will not build this page until then (buildFuture is off)")

    # url
    url = fm.get("url")
    if isinstance(url, str):
        year = (raw or "")[:4]
        pat = {"blog": rf"^/blog/{year}/{SLUG}$", "portfolio": rf"^/portfolio/{year}/{SLUG}$", "page": rf"^/{SLUG}$"}[kind]
        if not re.match(pat, url):
            shape = {"blog": f"/blog/{year}/<kebab-slug>", "portfolio": f"/portfolio/{year}/<kebab-slug>", "page": "/<name>"}[kind]
            err(p, "url", f"url '{url}' must be {shape}: lowercase, hyphens, no trailing slash, year matching the date")
    if "aliases" in fm and not (isinstance(fm["aliases"], list) and all(isinstance(a, str) and a.startswith("/") for a in fm["aliases"])):
        err(p, "url", "aliases must be a list of root-relative paths")

    # taxonomies
    tags = fm.get("tags")
    if kind == "page":
        for key in ("tags", "categories", "series"):
            if key in fm:
                err(p, "taxonomy", f"top-level pages do not take '{key}'")
    elif "tags" in fm:
        if not isinstance(tags, list) or not all(isinstance(t, str) for t in tags):
            err(p, "taxonomy", "tags must be a list of strings")
        else:
            for t in tags:
                if t not in vocab["tags"]:
                    hint = "" if re.match(rf"^{SLUG}$", t) else " (tags are lowercase kebab-case)"
                    err(p, "taxonomy", f"tag '{t}' is not in data/vocabulary.yaml{hint}; reuse an existing tag or add it there")
            if len(set(tags)) != len(tags):
                err(p, "taxonomy", "duplicate tags")
            if not 3 <= len(tags) <= 7:
                warn(p, "taxonomy", f"{len(tags)} tags; existing pages use 3 to 7")
            if kind == "portfolio" and tags[:1] != ["portfolio"]:
                err(p, "taxonomy", "portfolio entries list the 'portfolio' tag first")
            if kind == "blog" and "portfolio" in tags:
                err(p, "taxonomy", "the 'portfolio' tag is for portfolio entries only")
    if kind == "blog" and "categories" in fm and fm["categories"] != ["blog"]:
        err(p, "taxonomy", 'blog posts use exactly categories: ["blog"]')
    if kind == "portfolio":
        for key in ("categories", "series", "series_order"):
            if key in fm:
                err(p, "taxonomy", f"portfolio entries do not take '{key}'")

    # series
    if kind == "blog" and ("series" in fm or "series_order" in fm):
        series, order = fm.get("series"), fm.get("series_order")
        if not (isinstance(series, list) and len(series) == 1 and isinstance(series[0], str)):
            err(p, "series", "series must be a one-item list, for example series: [\"name\"]")
        elif series[0] not in vocab["series"]:
            err(p, "series", f"series '{series[0]}' is not in data/vocabulary.yaml (copy the name exactly, or register a new series there)")
        elif not isinstance(order, int) or isinstance(order, bool) or order < 1:
            err(p, "series", "a series part needs series_order: <whole number from 1>")
        else:
            spec = vocab["series"][series[0]]
            title = fm.get("title") if isinstance(fm.get("title"), str) else ""
            want_title = f"{spec['title_prefix']}, Part {order}: "
            if not title.startswith(want_title):
                err(p, "series", f"title must start with '{want_title}'")
            want_url = f"/blog/{(raw or '')[:4]}/{spec['url_slug']}-part-{order}"
            if isinstance(url, str) and url != want_url:
                err(p, "series", f"url must be '{want_url}'")
            desc = fm.get("description") if isinstance(fm.get("description"), str) else ""
            if not desc.startswith(f"Part {order} of a series "):
                err(p, "series", f"description must start with 'Part {order} of a series ...'")
            card = fm.get("thumbnailCard")
            if isinstance(card, dict) and card.get("kicker") != f"{spec['kicker']} · Part {order}":
                err(p, "series", f"thumbnailCard.kicker must be '{spec['kicker']} · Part {order}'")
            words = len(re.findall(r"\S+", page.body))
            if words < SERIES_MIN_WORDS:
                warn(p, "series", f"{words} words; series parts run about 3,000 words")


def check_thumbnail(page):
    p, fm = page.path, page.fm
    features = sorted(f.name for f in page.dir.iterdir() if f.is_file() and re.match(r"(?i)^(feature|cover|thumbnail)", f.name))
    card = fm.get("thumbnailCard")
    if features != ["feature.webp"]:
        hint = " Run: python3 scripts/thumbnail-card.py " + str(p.relative_to(ROOT)) if card else ""
        err(p, "thumbnail", f"bundle needs exactly one thumbnail named feature.webp (found: {', '.join(features) or 'none'}).{hint}")
    else:
        size = webp_size(page.dir / "feature.webp")
        if size != FEATURE_SIZE:
            err(p, "thumbnail", f"feature.webp must be a {FEATURE_SIZE[0]}x{FEATURE_SIZE[1]} WebP (3:2); found {size or 'not a WebP file'}")
    if card is not None:
        lines = card.get("title") if isinstance(card, dict) else None
        lines = [lines] if isinstance(lines, str) else lines
        if not isinstance(card, dict) or not lines or not all(isinstance(x, str) and x for x in lines):
            err(p, "thumbnail", "thumbnailCard needs kicker, title (a string or list of lines), and subtitle")
        else:
            for key in ("kicker", "subtitle"):
                if not isinstance(card.get(key), str) or not card[key]:
                    err(p, "thumbnail", f"thumbnailCard.{key} is required")
            for key in card:
                if key not in ("kicker", "title", "subtitle"):
                    err(p, "thumbnail", f"unknown thumbnailCard key '{key}'")
            for line in lines:
                if len(line) > MAX_CARD_LINE:
                    err(p, "thumbnail", f"thumbnailCard title line '{line}' is {len(line)} characters; split it (max {MAX_CARD_LINE} per line)")
        if fm.get("showHero") is not False:
            err(p, "thumbnail", "a page with thumbnailCard must set showHero: false (the card repeats the title)")
    if "thumbnailReview" in fm:
        due = fm["thumbnailReview"]
        if not isinstance(due, datetime.date) or isinstance(due, datetime.datetime):
            err(p, "thumbnail", "thumbnailReview must be a date: YYYY-MM-DD")
        elif due < datetime.date.today():
            warn(p, "thumbnail", f"thumbnail review was due {due}: {fm.get('thumbnailReviewNote', '')}")
        if "thumbnailReviewNote" not in fm:
            err(p, "thumbnail", "thumbnailReview needs a thumbnailReviewNote saying what to check")


def check_assets(page):
    """Files in the bundle and references to them."""
    p, body = page.path, page.body
    files = {f.name for f in page.dir.iterdir() if f.is_file()} - {"index.md"}
    strict = page.kind == "page" or not page.legacy
    used = {"feature.webp"}
    refs = []
    for m in re.finditer(r"!\[([^\]]*)\]\(\s*([^)\s]+)", body):
        if not m.group(1).strip():
            err(p, "image", f"image {m.group(2)} has no alt text; describe what it shows")
        refs.append(m.group(2))
    for m in re.finditer(r"\{\{<\s*carousel\b(.*?)>\}\}", body, re.S):
        im = re.search(r'images="\{?([^"}]*)\}?"', m.group(1))
        names = [x.strip() for x in im.group(1).split(",")] if im else []
        refs += names
        cap = re.search(r'captions="\{?(.*?)\}?"\s', m.group(1) + " ", re.S)
        keys = set(re.findall(r"(?:^|,)\s*([^,:]+\.\w+):", cap.group(1))) if cap else set()
        for n in names:
            if n not in keys:
                err(p, "image", f"carousel image {n} has no caption (every slide needs one; it is also the alt text)")
    for m in re.finditer(r"\{\{<\s*(?:video|figure)\b(.*?)>\}\}", body, re.S):
        refs += re.findall(r'(?:src|poster)="([^"]+)"', m.group(1))
    refs += re.findall(r'(?:src|href)="([^"/:]+\.\w+)"', body)
    for ref in refs:
        if re.match(r"^(https?:)?//|^/", ref):
            if re.match(r"^(https?:)?//", ref) and re.search(r"\.(png|jpe?g|webp|gif|svg|mp4)(\?|$)", ref, re.I):
                err(p, "image", f"remote media {ref}: copy it into the bundle instead of hotlinking")
            continue
        used.add(ref)
        if ref not in files:
            near = [f for f in files if f.lower() == ref.lower()]
            err(p, "broken-image", f"{ref} is referenced but not in the bundle" + (f" (did you mean {near[0]}? names are case-sensitive)" if near else ""))
    for name in sorted(files):
        f = page.dir / name
        if name not in used and not re.search(re.escape(name), body):
            warn(p, "image", f"{name} is in the bundle but never referenced")
        if not strict:
            continue
        ext = f.suffix.lower()
        if not FILE_RE.match(name) and ext != ".pdf":
            err(p, "image", f"file name {name} must be lowercase kebab-case")
        if ext in RASTER:
            err(p, "image", f"{name}: convert images to WebP (see docs/images.md)")
        limit = MAX_VIDEO_BYTES if ext in (".mp4", ".webm") else MAX_IMAGE_BYTES if ext == ".webp" else None
        if limit and f.stat().st_size > limit:
            err(p, "image", f"{name} is {f.stat().st_size // 1000} kB; keep it under {limit // 1000} kB")


PRIVACY_ID_RE = re.compile(r"(?<![\w.-])\d{17,20}(?![\w-])")
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")


def check_text(page, vocab, urls):
    p = page.path
    prose = prose_only(page.body)
    strings = [v for v in page.fm.values() if isinstance(v, str)]
    card = page.fm.get("thumbnailCard")
    if isinstance(card, dict):
        strings += [v for v in card.values() if isinstance(v, str)]
    numbered = [(f"line {i}", line) for i, line in enumerate(prose.split("\n"), page.text[: len(page.text) - len(page.body)].count("\n") + 1)]
    numbered += [("front matter", s) for s in strings]

    for where, line in numbered:
        if "—" in line or "–" in line:
            err(p, "style", f"{where}: em or en dash; this site uses commas, colons, or separate sentences instead")
        if where != "front matter" and re.match(r"^# ", line):
            err(p, "style", f"{where}: body headings start at ## (the title is the only H1)")
        if where != "front matter" and re.match(r"^\s*TODO\b", line):
            err(p, "placeholder", f"{where}: TODO placeholder left in the body")

    whole = page.text
    for m in PRIVACY_ID_RE.finditer(whole):
        err(p, "privacy", f"{m.group(0)[:4]}... looks like a Discord/account ID; remove or replace it with a made-up placeholder")
    for m in EMAIL_RE.finditer(whole):
        if m.group(0).lower() not in vocab["allowed_emails"] and not re.search(r"@(example\.(com|org|net)|[\w.-]*\.(invalid|test))$", m.group(0), re.I) and not re.search(r"\.(webp|png|jpe?g|mp4)$", m.group(0), re.I):
            err(p, "privacy", f"email address {m.group(0)}: only {', '.join(vocab['allowed_emails'])} or example.com addresses may appear")
    for m in re.finditer(r"github\.com/zle3/([\w.-]+)", whole, re.I):
        repo = m.group(1).rstrip(".")
        if repo not in vocab["public_repos"]:
            err(p, "privacy", f"link to github.com/zle3/{repo}, which is not listed under public_repos in data/vocabulary.yaml; private repos are not linked")

    for m in re.finditer(r"\]\(\s*([^)\s]+)", page.body):
        target = m.group(1)
        if re.match(r"^https?://(www\.)?zachle\.info(/|$)", target):
            err(p, "link", f"{target}: link to this site with a root-relative path (/blog/...), not the full domain")
        elif target.startswith("/") and not target.startswith("//"):
            path = re.sub(r"[#?].*$", "", target).rstrip("/") or "/"
            ok = path in urls or path in ("/", "/blog", "/portfolio", "/index.xml") or re.match(r"^/(tags|series|categories)(/|$)", path)
            if not ok:
                parent, _, name = path.rpartition("/")
                ok = parent in urls and (urls[parent].dir / name).is_file()
            if not ok:
                err(p, "link", f"internal link {target} does not match any page url")


def check_site(pages, vocab):
    """Checks across pages: unique urls, series numbering."""
    urls = {}
    for page in pages:
        for u in [page.fm.get("url")] + list(page.fm.get("aliases") or []):
            if isinstance(u, str):
                if u in urls and urls[u] is not page:
                    err(page.path, "url", f"url {u} is already used by {urls[u].path.relative_to(ROOT)}")
                urls.setdefault(u, page)
    by_series = {}
    for page in pages:
        s, o = page.fm.get("series"), page.fm.get("series_order")
        if isinstance(s, list) and len(s) == 1 and isinstance(o, int):
            by_series.setdefault(s[0], []).append((o, page))
    for name, parts in by_series.items():
        orders = sorted(o for o, _ in parts)
        if orders != list(range(1, len(orders) + 1)):
            err(parts[0][1].path, "series", f"series '{name}' parts are numbered {orders}; they must run 1..{len(orders)} with no gaps or repeats")
        ordered = [pg for _, pg in sorted(parts, key=lambda x: x[0])]
        dates = [pg.raw_value("date") or "" for pg in ordered]
        if all(DATE_RE.match(d) for d in dates):
            stamps = [datetime.datetime.fromisoformat(d.replace("Z", "+00:00")) for d in dates]
            if any(a >= b for a, b in zip(stamps, stamps[1:])):
                err(ordered[0].path, "series", f"series '{name}': each part's date must be later than the previous part's (same-day parts step by one minute)")
    return urls


def check_git(pages, urls):
    """Published urls must keep working; edited /now and /about bump lastmod."""
    base = "origin/main" if git("rev-parse", "--verify", "-q", "origin/main") else "HEAD"
    top = git("rev-parse", "--show-toplevel")
    listing = git("ls-tree", "-r", "--name-only", "--full-name", base, "--", "content")
    if not top or listing is None:
        print("note: git history not available; skipped published-url and lastmod checks", file=sys.stderr)
        return
    top = pathlib.Path(top.strip())
    old_vocab_text = git("show", f"{base}:zachleinfo/data/vocabulary.yaml")
    if old_vocab_text:
        try:
            old_vocab = yaml.safe_load(old_vocab_text) or {}
            new_vocab = yaml.safe_load(VOCAB.read_text(encoding="utf-8")) or {}
            for kind in ("tags", "series", "categories", "public_repos"):
                for name in sorted(set(new_vocab.get(kind) or []) - set(old_vocab.get(kind) or [])):
                    warn(VOCAB, "new-vocabulary", f"new {kind} entry '{name}' (not on {base}): tell the owner in your report under 'Needs your attention'")
        except yaml.YAMLError:
            pass
    current = {pg.path: pg for pg in pages}
    for name in listing.splitlines():
        if not name.endswith(".md"):
            continue
        old_text = git("show", f"{base}:{name}")
        if old_text is None:
            continue
        old_raw, old_body = split_front_matter(old_text)
        try:
            old = yaml.safe_load((old_raw or "").replace("\t", " ")) or {}
        except yaml.YAMLError:
            continue
        path = top / name
        old_url = old.get("url")
        if isinstance(old_url, str) and old_url not in urls:
            where = path if path.exists() else "content"
            err(where, "url", f"published url {old_url} (from {base}:{name}) no longer exists; restore it or list it under aliases on the page that replaces it")
        page = current.get(path)
        if page and "lastmod" in old and page.body.strip() != (old_body or "").strip() and str(page.fm.get("lastmod")) == str(old.get("lastmod")):
            err(path, "lastmod", "body changed but lastmod was not updated; set lastmod to today's date")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--strict", action="store_true", help="treat warnings as errors")
    ap.add_argument("--deploy", action="store_true", help="Cloudflare mode: fail only on errors from major rules")
    ap.add_argument("--no-git", action="store_true", help="skip checks that compare against git history")
    args = ap.parse_args()

    vocab = yaml.safe_load(VOCAB.read_text(encoding="utf-8"))
    pages = []
    for path in sorted(CONTENT.rglob("*")):
        if path.is_dir() or path == CONTENT / "_index.md":
            continue
        if path.suffix == ".md":
            if path.name != "index.md":
                err(path, "layout", "every page is a bundle folder with index.md; no other Markdown files under content/")
                continue
            pages.append(Page(path))
        elif not (path.parent / "index.md").exists():
            err(path, "layout", "stray file: media lives next to the index.md that uses it")

    loaded = []
    for page in pages:
        check_layout(page)
        if page.load():
            loaded.append(page)
            check_front_matter(page, vocab)
            check_thumbnail(page)
            check_assets(page)
    urls = check_site(loaded, vocab)
    for page in loaded:
        check_text(page, vocab, urls)
    if not args.no_git:
        check_git(loaded, urls)

    home = CONTENT / "_index.md"
    home_page = Page.__new__(Page)
    home_page.path, home_page.dir, home_page.kind, home_page.legacy = home, home.parent, "page", False
    home_page.text = home.read_text(encoding="utf-8")
    home_page.raw, home_page.body = split_front_matter(home_page.text)
    home_page.fm = yaml.safe_load(home_page.raw or "") or {}
    check_text(home_page, vocab, urls)

    errors = sum(1 for f in findings if f[0] == "ERROR")
    warnings = len(findings) - errors
    major = sum(1 for f in findings if f[0] == "ERROR" and f[2] not in MINOR_RULES)
    for level, rel, rule, msg in sorted(findings, key=lambda f: (f[1], f[0])):
        tag = " (major, blocks deploy)" if level == "ERROR" and rule not in MINOR_RULES else ""
        print(f"{rel}: {level}{tag} [{rule}] {msg}")
    print(f"check-content: {len(pages) + 1} pages, {errors} error(s) ({major} major), {warnings} warning(s)")
    if args.deploy:
        return 1 if major else 0
    return 1 if errors or (args.strict and warnings) else 0


if __name__ == "__main__":
    sys.exit(main())
