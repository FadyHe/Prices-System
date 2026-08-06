#!/usr/bin/env bash
# One source of truth for the shared search/scoring module. The app tree
# (lib/search/) is authoritative; scraper-service/src/search/ mirrors it.
#  - `pnpm sync:search` copies app -> scraper-service.
#  - `pnpm sync:search --check` exits non-zero if the trees differ (used by
#    CI to catch drift without mutating the working tree).
set -euo pipefail

SRC="lib/search"
DST="scraper-service/src/search"

files=(normalize.ts score.ts stopwords.ts min-relevance.ts)

if [[ "${1:-}" == "--check" ]]; then
  for f in "${files[@]}"; do
    if ! diff -q "$SRC/$f" "$DST/$f" >/dev/null 2>&1; then
      echo "[sync-search] DRIFT in $f — run 'pnpm sync:search' to sync." >&2
      exit 1
    fi
  done
  echo "[sync-search] in sync."
  exit 0
fi

for f in "${files[@]}"; do
  cp "$SRC/$f" "$DST/$f"
done
echo "[sync-search] synced $DST."
