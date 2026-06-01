---
name: Default reading translation (Khattab)
description: Where the bundled English translation comes from and the data-dir sync rule
---
# Default reading translation

The app's default reading translation is Dr. Mustafa Khattab "The Clear Quran",
bundled into every `*/data/chapters/{1..114}.json` `translation` field (offline,
no runtime API). Regenerate via `scripts/apply-khattab-translation.mjs`.

**Why fawazahmed0, not Quran.com:** Quran.com's public API translation id 131
(Khattab) now returns empty — the edition is copyrighted and was removed. The
freely-mirrored `fawazahmed0/quran-api` `eng-mustafakhattaba` (the "Allah"
edition, divine name = "Allah") carries the same text, clean (no HTML/footnotes).
The ornate brackets `˹…˺` are intentional Clear Quran house style — keep them.

**How to apply / invariant:** Chapter data lives in TWO dirs that must stay in
sync: `client/public/data/chapters` and `public/data/chapters`. The migration
script and the search-corpus generator both dual-write. The offline search corpus
(`scripts/generate-search-corpus.mjs`) reads index-0 (primary) FROM the bundled
chapter files, so it must be regenerated after any translation swap; it adds
Sahih International + 4 others as extra searchable editions for recall.
