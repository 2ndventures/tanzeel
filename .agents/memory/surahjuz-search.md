---
name: SurahJuz verse search
description: How/why SurahJuz verse search works and the no-external-APIs constraint
---

# SurahJuz verse search

SurahJuz verse search is **fully client-side / offline-first** — it must not call
any external API. The engine lives in `client/src/services/searchService.ts`
(`searchVersesLocal`) and runs three ranked tiers over the bundled corpus:
exact whole-word/phrase > stem-AND (Porter stem + diacritic/lowercase
normalization of both query and text) > concept (query expanded via
`client/src/lib/topicIndex.ts` + `client/src/lib/synonyms.ts`). Results are
deduped by verse; within a tier they sort by `matchedTranslationCount` (how many
bundled translations matched), so **every tier — including concept — must
populate that field** or within-tier ordering silently degrades to verse order.

**Why:** the app targets native Capacitor builds and must work offline. A prior
design also merged remote quran.com `/api/search` results; that remote path and
the server route were removed. Do not reintroduce server-side or external search
for this feature.

**How to apply:** keep search logic on-device. If you add a new match tier or
change result shape, update `VerseSearchResult`/`MatchType` and make sure the
tier sets `matchedTranslationCount`. The corpus is served at
`/data/search-corpus.json` (see search-corpus.md for the dual-write sync rule).
