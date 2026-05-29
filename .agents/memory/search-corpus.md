---
name: Offline search corpus
description: How the client-side verse-search corpus is generated and kept in sync
---

# Offline verse-search corpus

The full-text verse search runs fully on-device from a prebuilt corpus file, not at build time.

**Rule:** `search-corpus.json` is a checked-in generated artifact. It is NOT rebuilt during `vite build` — Vite just copies it from `client/public/data/` into `dist/public/data/`. If translations (or the verse set) change, you must re-run the generator script manually and commit the new file.

**Why:** the corpus mixes a locally-bundled translation (Sahih, read from the chapters JSON) with translations fetched from api.alquran.cloud at generate time. Network fetch can't happen at app runtime offline, and shouldn't happen on every build, so it's a one-off generation step.

**How to apply:** the corpus must exist and be byte-identical in BOTH `client/public/data/search-corpus.json` and `public/data/search-corpus.json` (data-dir convention; the generator writes both). When changing translations/shape, re-run the generator and confirm both files match. The `names` array order in the JSON is the index order the search service relies on — keep it stable.
