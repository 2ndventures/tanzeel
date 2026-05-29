---
name: Two audioCache modules
description: Why client/src has both lib/audioCache.ts and services/audioCache.ts
---
There are intentionally TWO audio cache modules; they are NOT duplicates:
- `client/src/lib/audioCache.ts` — in-memory word-timing data cache
  (`getTimingDataFromMemory`/`storeTimingDataInMemory`), used by
  `hooks/useWordTimingAudio.ts`.
- `client/src/services/audioCache.ts` — Capacitor Filesystem MP3 cache
  (`getManifest`, `initAudioCache`, `isFullChapterDownloaded`, etc.),
  used broadly.

**Why:** a dead-code audit flagged `lib/audioCache.ts` as a redundant
legacy duplicate of the services version — it is not. Both are live.
**How to apply:** do not delete `lib/audioCache.ts`; grep its named
exports before assuming it is dead.
