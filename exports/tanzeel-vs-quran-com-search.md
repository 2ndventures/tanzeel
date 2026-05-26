# Tanzeel Search vs Quran.com Search

## What we have today (post Tier 1)

We search verse text in **one corpus** of English translations, using **literal word matching**.

Two layers run in parallel on every query:

1. **Remote** — proxy Quran.com's public search API across 10 English translations (Saheeh, Pickthall, Yusuf Ali, Khattab, Maududi, Hilali, Mufti Taqi, etc.).
2. **Local** — substring match over the Saheeh International translation bundled in the app (works offline).

Results are merged and deduped by verse. Cached for 1 hour.

## What Quran.com has

Three things we don't:

1. **Arabic morphology index.** Every word in the Quran is pre-tagged with its three-letter Arabic root. A search for "backbiting" maps to the root **غ‑ي‑ب** (*gh-y-b*), which surfaces every verse containing that root — even verses where the English word "backbiting" never appears. This is the single biggest reason their counts are larger than ours.
2. **Tafsir (commentary) corpus.** They also search ~50 MB of classical commentary (Ibn Kathir, Jalalayn, Maarif). A verse whose *commentary* discusses a topic gets surfaced even if the verse itself doesn't mention it.
3. **Stemming + synonym expansion.** "backbiting" automatically expands to *backbite, backbiter, slander, gossip, defame, ghiybah*. We currently match the exact substring only.

## Side-by-side

| Capability | Tanzeel (today) | Quran.com |
| --- | --- | --- |
| English translations searched | 10 (via remote) + 1 (local) | 50+ |
| Arabic root / morphology search | No | Yes |
| Tafsir (commentary) search | No | Yes |
| Stemming (run/running/ran) | No | Yes |
| Synonym expansion | No | Yes |
| BM25 / relevance ranking | No (simple merge order) | Yes |
| Works fully offline | Yes (local fallback) | No |
| Hard result cap | None on our end (public API caps ~5/page) | ~5/page via public API, unlimited on their site |

## What this means in practice

For **common words** ("patience", "mercy", "charity", "hellfire") we're now roughly on par — we return 30–70 verses where we used to return a handful.

For **narrow words** ("backbiting", "riba", "zakat") we still trail because:

- Quran.com's *public* API only returns ~5 results per page even when it claims more exist.
- We can't search by Arabic root the way they can.

## Closing the gap

- **Tier 2** (~1–2 days): Bundle 4 more translations locally and add stemming. Closes most of the common-word gap; works offline.
- **Tier 3** (~4–7 hours of build time): Add the Quranic Arabic Corpus morphology + a local BM25 index. Closes the narrow-word gap and removes the dependency on Quran.com being online. Adds ~7 MB to the app bundle. Requires a credit line for the corpus (GPL attribution).

Tafsir search isn't recommended for a mobile app — it'd add ~50 MB and a lot of noise to results.
