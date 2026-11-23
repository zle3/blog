# zachle.info Hugo site

This folder is the Hugo root. The contributor rules for the whole repository are in [../AGENTS.md](../AGENTS.md), with details in [../docs/](../docs/). Read `../AGENTS.md` before changing anything here.

Quick reference (run from this folder):

```sh
bash scripts/new-content.sh blog|series-part|portfolio <slug>   # scaffold a page
bash scripts/verify.sh                                           # checker + full build
hugo server --bind 127.0.0.1 --port 1313                         # preview for the owner's review
```

Do not push: pushing deploys the live site, and the owner reviews the local preview first.
