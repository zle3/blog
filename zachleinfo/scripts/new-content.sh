#!/usr/bin/env bash
# Scaffold a new page bundle with the right folder name and front matter.
#
#   bash scripts/new-content.sh blog          # a standalone blog post, dated today
#   bash scripts/new-content.sh series-part   # one part of a blog series
#   bash scripts/new-content.sh portfolio my-project   # portfolio entry; slug names the folder
#
# Run from the zachleinfo/ folder. Prints the created index.md. Every TODO in
# it must be replaced before scripts/check-content.py will pass.
set -euo pipefail
cd "$(dirname "$0")/.."

kind="${1:-}"
year="$(date +%Y)"
case "$kind" in
  blog|series-part)
    dir="content/blog/$year/$(date +%Y%m%d)"
    # A second, third, ... post on the same day gets -2, -3, ...
    if [ -e "$dir" ]; then
      n=2
      while [ -e "$dir-$n" ]; do n=$((n + 1)); done
      dir="$dir-$n"
    fi
    ;;
  portfolio)
    slug="${2:-}"
    if ! [[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
      echo "usage: bash scripts/new-content.sh portfolio <kebab-slug>" >&2
      exit 2
    fi
    dir="content/portfolio/$year/$(date +%Y%m)-$slug"
    if [ -e "$dir" ]; then
      echo "$dir already exists" >&2
      exit 1
    fi
    ;;
  *)
    sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//' >&2
    exit 2
    ;;
esac

hugo new content --kind "$kind" "${dir#content/}/index.md"
echo "Next: replace every TODO in $dir/index.md, add feature.webp (docs/images.md), then run: bash scripts/verify.sh"
