#!/usr/bin/env bash
# The one command to run before you call a change finished:
#
#   bash scripts/verify.sh
#
# 1. scripts/check-content.py (front matter, vocabulary, thumbnails, links, privacy lints)
# 2. a full Hugo build into a temporary folder, failing on any warning or error
#
# It never deploys, commits, or touches public/. Run from anywhere.
set -euo pipefail
cd "$(dirname "$0")/.."

pinned="$(sed -n 's/^HUGO_VERSION="\(.*\)"/\1/p' build.sh)"
if ! command -v hugo >/dev/null; then
  echo "verify: hugo is not installed. Install Hugo extended $pinned (the version pinned in build.sh)." >&2
  exit 1
fi
if ! hugo version | grep -q "v$pinned"; then
  echo "verify: note: local $(hugo version | cut -d' ' -f2) differs from the pinned $pinned in build.sh" >&2
fi

echo "== check-content"
python3 scripts/check-content.py "$@"

echo "== hugo build"
out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT
log="$out/build.log"
if ! hugo --destination "$out/public" --printPathWarnings >"$log" 2>&1; then
  cat "$log"
  echo "verify: FAILED (hugo build error)" >&2
  exit 1
fi
# A thumbnail review falling due is a reminder for that page's author, not a
# fault in the current change, so it is shown but does not fail the run.
if grep -E '^WARN.*THUMBNAIL REVIEW DUE' "$log"; then
  echo "verify: note: thumbnail review(s) due, see above (report them if the page is not yours)" >&2
fi
if grep -E '^(WARN|ERROR)' "$log" | grep -v 'THUMBNAIL REVIEW DUE'; then
  echo "verify: FAILED (hugo printed the warnings above; fix them, do not ignore them)" >&2
  exit 1
fi
grep -E 'Pages|Total' "$log" || true
echo "verify: OK"
