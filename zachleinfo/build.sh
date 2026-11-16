#!/usr/bin/env bash
# Cloudflare Pages build command: `bash build.sh`
# Pins the Hugo version in git (Blowfish v3.10 needs Hugo 0.166-0.169) instead
# of relying on the build image default. Bump both lines together when upgrading:
# checksums are in hugo_<version>_checksums.txt on the Hugo release page.
set -euo pipefail

HUGO_VERSION="0.169.0"
HUGO_SHA256="c41672a0725d307758a132bc94a962e59760eb33f9ba08c991b81f9881d6fa7d"

tarball="hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz"
bin_dir="$(mktemp -d)"
trap 'rm -rf "$bin_dir"' EXIT

curl -fsSL -o "$bin_dir/$tarball" \
  "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/${tarball}"
echo "${HUGO_SHA256}  $bin_dir/$tarball" | sha256sum -c -
tar -xzf "$bin_dir/$tarball" -C "$bin_dir" hugo

"$bin_dir/hugo" version
"$bin_dir/hugo" "$@"
