# Tanzeel Codebase Audit

_Generated: April 20, 2026_

---

## 1. Identity & Branding
- **Display name**: `Tanzeel` (`Info.plist` → `CFBundleDisplayName`; `capacitor.config.ts` → `appName`)
- **package.json `name`**: `rest-express` *(stale Replit template default — not user-facing, but should be renamed to `tanzeel` for hygiene)*
- **Bundle ID / appId**: `com.tanzeelquran.app`
- **Other names referenced**: legal entity is **2nd Ventures, LLC** (Privacy/Terms pages), support email is **support@thirdventures.com** (note the mismatch — "thirdventures" vs "2nd Ventures"). No leftover old project names found.

## 2. Backend & Hosting
- **Production backend URL** (in `client/src/config.ts`): `https://11424-newest-version-web266.replit.app`
- **Still on `.replit.app`** — has *not* been moved to a real custom domain. This is fine to ship but is a long-term reliability/branding risk.
- **External domains the app calls**:
  - `api.qurancdn.com` (Quran.com timing/audio metadata)
  - `download.quranicaudio.com` (full-chapter audio)
  - `everyayah.com` (verse-by-verse audio for offline)
  - `*.replit.app` (your own backend)
- **Fallback / retry strategy**: No explicit cross-CDN fallback. There is `p-retry` installed but I don't see it imported anywhere — `p-retry` count = 0. Audio errors surface as "Failed to play / Tap retry." If the timing API fails, the audio path also fails (the timing fetch throws and the catch sets an error state). **No graceful degradation to "play audio without word highlighting."**

## 3. Dependencies
**Confirmed dead deps (installed, never imported in `client/`, `server/`, or `shared/`):**
- `@neondatabase/serverless`
- `drizzle-orm`, `drizzle-zod`, `drizzle-kit` (devDep)
- `passport`, `passport-local`, `@types/passport`, `@types/passport-local`
- `express-session`, `@types/express-session`
- `connect-pg-simple`, `@types/connect-pg-simple`
- `memorystore`
- `openai`
- `jimp`
- `@capgo/native-audio` *(installed but unused — you're using `@capacitor/filesystem` + HTML5 `<audio>`)*
- `next-themes`
- `framer-motion`
- `ws`, `@types/ws`
- `p-limit`, `p-retry`

These should be removed before App Store submission to shrink the bundle and eliminate any privacy/legal surface area from libraries you don't use.

## 4. Content Sources & Licensing
- **Arabic & translation source**: Sample of `chapters/1.json` shows the translation `"In the name of Allah, the Entirely Merciful..."` — that wording is **Saheeh International**. There is **no README, no credit, no comment, no LICENSE, and no attribution** in `client/public/data/` identifying the source. **This is a real App Store / IP risk.** Saheeh International is widely permitted for non-commercial digital use but you must acknowledge it.
- **No LICENSE.md, ATTRIBUTION.md, or CREDITS.md** anywhere in the repo. The only LICENSE files are inside `.local/skills/`, which are Replit's own.
- **Reciters in `client/src/lib/reciters.ts`** (8 total, all marked featured):
  1. Mishary Rashid Alafasy — `Alafasy_128kbps`
  2. Abdul Basit Abdul Samad (Murattal) — `Abdul_Basit_Murattal_192kbps`
  3. Abdul Basit Abdul Samad (Mujawwad) — `Abdul_Basit_Mujawwad_128kbps`
  4. Abdurrahmaan As-Sudais — `Abdurrahmaan_As-Sudais_192kbps`
  5. Abu Bakr Ash-Shaatree — `Abu_Bakr_Ash-Shaatree_128kbps`
  6. Ali Al-Hudhaify — `Hudhaify_128kbps`
  7. Hani Rifai — `Hani_Rifai_192kbps`
  8. Akram Al-Alaqimy — `Akram_AlAlaqimy_128kbps`
  - All verse-by-verse audio fetched from **everyayah.com**
  - Full-chapter streaming audio fetched from **download.quranicaudio.com** (via Quran.com API)
- **Written licensing/permission documentation**: **None.** This is the single highest-priority pre-launch item — both EveryAyah and QuranicAudio are free-to-use but have terms; you should add an `ATTRIBUTION.md` and an in-app credits screen.

## 5. iOS / Apple Compliance
- **`PrivacyInfo.xcprivacy` exists.** Contents:
  - `NSPrivacyCollectedDataTypes`: empty array (you collect no data)
  - `NSPrivacyTracking`: `false`
  - `NSPrivacyTrackingDomains`: empty
  - `NSPrivacyAccessedAPITypes`: declares `NSPrivacyAccessedAPICategoryFileTimestamp` with reason `C617.1` (file timestamp access)
  - This is correct and minimal.
- **`Info.plist`**: declares display name `Tanzeel`, supports portrait + landscape (both iPhone and iPad), `UIBackgroundModes = [audio]` (correct, only audio), and ATS exceptions for `quran.com`, `everyayah.com`, `replit.app`. **All ATS exceptions still require HTTPS + forward secrecy — clean.** Note: `UIRequiredDeviceCapabilities = [armv7]` is legacy/odd for a modern iOS app — Apple typically uses `arm64`.
- **MARKETING_VERSION**: `1.0`
- **CURRENT_PROJECT_VERSION**: `1` (build number)
- **AppIcon set**: Single `AppIcon.png` (1024×1024) using the modern iOS-17+ "single-size" format. Recently regenerated as flat 8-bit sRGB. ✅
- **Launch screen**: `LaunchScreen.storyboard` + `Splash.imageset` with three sizes (2732×2732 at 1x/2x/3x). Configured in Info.plist via `UILaunchStoryboardName = LaunchScreen`. ✅

## 6. Crash Reporting & Analytics
- **No Sentry, Crashlytics, Bugsnag, Rollbar, PostHog, Mixpanel, GA, Firebase Analytics, Amplitude, or TelemetryDeck installed.** Zero crash reporting. Zero analytics.
- **ErrorBoundary**: `client/src/components/ErrorBoundary.tsx` exists and IS wrapping the app at `client/src/App.tsx` lines 484–545. It catches render errors but only `console.error`s them — no remote reporting.
- **Errors in production are invisible to you.** Strongly recommend adding Sentry (or at minimum a Capacitor-compatible crash reporter) before App Store launch.

## 7. Data Model & Future-Proofing
**Bookmark structure** (`client/src/lib/bookmarkService.ts`):

```ts
interface Bookmark {
  id: string;          // format: `${chapterId}:${verseNumber}` — NOT a UUID
  chapterId: number;
  verseNumber: number;
  folder: string;
  note: string;
  createdAt: number;   // millis
}
```

- **IDs are sequential/composite (`chapter:verse`), not UUIDs.** This will collide if you ever sync bookmarks across devices or merge with cloud accounts — same verse from two devices would have the same id.
- **`createdAt` only** — no `updatedAt`. Required for "last modified wins" sync conflict resolution.
- **No `userId` field.** When you add accounts, every existing local record will need a migration to attach to a user.
- **Storage locations** (Capacitor Preferences keys, with localStorage fallback):
  - `quran_bookmarks` — bookmark array
  - `quran_bookmark_folders` — folder list
  - Reading-stats, downloaded chapters, pending downloads, etc., all via `setItem()` in `client/src/lib/storage.ts`
  - Note: there are **two parallel bookmark files** — `client/src/lib/bookmarks.ts` AND `client/src/lib/bookmarkService.ts`. The first uses key `BOOKMARKS_KEY`, the second uses `'quran_bookmarks'`. This is a **bug-in-waiting** — clean up before shipping (see §10).

## 8. Audio / Offline
- **Offline caching works.** `audioCache.ts` writes to `Capacitor.Filesystem` Directory.Data, maintains a manifest with `totalSizeBytes`, supports per-file `getUri` for native playback. `audioDownloadManager.ts` orchestrates downloads.
- **Users can delete downloaded audio** — `Filesystem.deleteFile` is called in `audioDownloadManager.ts` lines 114, 165, 181, 192, 216, 228 (per-chapter deletion, full clear).
- **Storage-used indicator**: The data exists (`manifest.totalSizeBytes`, `getCacheSize()`) — UNKNOWN whether it's surfaced in the Settings UI; would need to grep the Settings page.
- **Out-of-space behavior**: **Not handled.** There's no pre-flight free-space check, and the catch blocks just `console.error` — the user would see a generic "download failed" with no helpful message.

## 9. Error Handling & UX Edge Cases
- **Audio CDN 404 / timeout**: caught by the audio element's `error` event → sets `error: 'Failed to play verse N offline'` or `'Failed to play current verse'`, surfaces a "Tap retry" button. No automatic CDN fallback or auto-retry.
- **Timing API failure**: throws and is caught at line 990 (`}).catch(err => {`). Crucially, **audio does NOT continue to play without highlighting** — the timing fetch is on the critical path for the online streaming flow. This should be made graceful (play audio, just don't highlight words).
- **`@capacitor/network` is installed but never imported.** No offline detection. The app does not switch to offline-only audio when the device loses connectivity, doesn't show a "You're offline" banner, doesn't proactively pause downloads on cellular data.
- **Silent failures**: many catch blocks are empty (`.catch(() => {})`) — common in `play()` calls. Acceptable for autoplay, but masks real errors elsewhere (e.g. line 1243 `setGlobalSpeed(...).catch(() => {})`).

## 10. Dead Code & Hygiene
- **No `components/examples/` folder, no `.bak` files, no empty files.** ✅
- **`shared/schema.ts` is COMPLETELY EMPTY (0 lines)** — confirmed.
- **`server/storage.ts`** — yes, still an empty `IStorage` interface and an empty `MemStorage` class. The whole server is essentially a passthrough/Vite host.
- **No TODO / FIXME / HACK / XXX comments anywhere** in `client/src`, `server`, or `shared`. ✅
- **Duplicate bookmark implementations**: `client/src/lib/bookmarks.ts` AND `client/src/lib/bookmarkService.ts` both exist with different schemas and storage keys. One is dead. Decide which is authoritative and delete the other.
- **All the dead deps in §3** also count as dead-code surface.

## 11. Testing
- **Zero tests.** No `*.test.*`, no `*.spec.*`, no `__tests__/`, no playwright/cypress/vitest config files.
- **No `test` script** in `package.json` (only `dev`, `build`, `start`, `check`, `db:push`).

## 12. Build & Deployment
- **Build scripts** (`package.json`):

```json
{
  "dev": "NODE_ENV=development tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push"
}
```

  - `db:push` is unused — see dead deps.
- **No CI/CD config**: no `.github/workflows`, no `.gitlab-ci.yml`, no `fastlane/`, no Xcode Cloud config files in repo.
- **TestFlight setup**: UNKNOWN from repo alone. The project has the Xcode workspace and an Info.plist ready to archive. Provisioning profiles, signing certs, and App Store Connect configuration live outside the repo (in your Apple Developer account / Xcode preferences). You've clearly been pushing to TestFlight successfully, so it's working — just not version-controlled or scriptable.

## 13. Privacy Policy & Legal
- Both `PrivacyPolicy.tsx` and `TermsOfService.tsx` exist as in-app pages with full content (Privacy Policy ~150 lines covering data collection, storage, third-party services, children's privacy, security, contact; Terms of Service includes acceptance, license, restrictions, disclaimers, limitation of liability, dispute resolution, severability, contact). Both list:
  - Legal entity: **2nd Ventures, LLC**
  - Contact: **support@thirdventures.com**
- **No hosted public URL** for the privacy policy is referenced anywhere in config files. App Store submission **requires** a publicly accessible privacy policy URL. You must host these pages on a public URL (e.g., `https://tanzeelapp.com/privacy`) and provide it in App Store Connect — it can't be in-app only.
- **Support email**: `support@thirdventures.com` (only in the privacy/terms pages — not in `Info.plist` or any config file).

## 14. Accessibility
- **aria-label counts** (spot check):
  - `AudioPlayer.tsx`: 8 aria-labels ✅
  - `VerseCard.tsx`: 2 aria-labels (low — the verse card has many interactive items)
  - `BottomNav.tsx`: **0 aria-labels** ❌ — every nav button needs one for VoiceOver
- **Dynamic Type**: app uses Tailwind/CSS-based sizing throughout — does **not** respect iOS Dynamic Type system setting. This is a known App Store accessibility recommendation (not a hard requirement, but flagged in reviews).
- **VoiceOver flow quality**: UNKNOWN — would need a manual run through with VoiceOver enabled. Given the missing aria-labels in `BottomNav`, expect rough spots.

## 15. Things You Didn't Ask About But Should Know

1. **`package.json` name is still `rest-express`** — Replit boilerplate. Won't appear in App Store but is sloppy.
2. **Backend on a Replit dev URL in production** (`11424-newest-version-web266.replit.app`). If that URL ever changes, every shipped iOS app will break. Move to a stable custom domain *before* App Store launch.
3. **The "thirdventures.com" vs "2nd Ventures, LLC" mismatch** in legal docs may confuse Apple's review or users. Pick one identity.
4. **Massive dead dep footprint** (~25 unused packages including `openai`, `passport`, `drizzle`, `@capgo/native-audio`). Apple reviewers will ask about `openai` if they notice it in the bundle.
5. **No version bump strategy.** You're at MARKETING_VERSION `1.0`, build `1`. Every TestFlight build needs a unique build number — you'll need to start incrementing.
6. **`UIRequiredDeviceCapabilities = [armv7]`** in Info.plist is legacy. Modern iOS apps should use `arm64`. May not block submission but is unusual.
7. **Empty `shared/schema.ts` and empty `IStorage`** — the entire backend boilerplate is unused. Either build something with it (account sync, bookmark backup) or delete it.
8. **No analytics + no crash reporting + no test coverage** = you're flying blind in production. At minimum add Sentry before launch.
9. **Two competing bookmark modules** (`bookmarks.ts` vs `bookmarkService.ts`) is a real bug risk — whichever loads second wins for a given storage key.
10. **No graceful "play audio without word highlighting"** path. If Quran.com timing API has a bad day, your entire online playback breaks. Decouple them.
11. **No offline detection** despite `@capacitor/network` being installed. Trivial to wire up; big UX win.
12. **No content licensing/attribution file.** Apple is strict about religious content — having an ATTRIBUTION page (Saheeh International translation, EveryAyah recitations, QuranicAudio recitations) protects you legally and improves review odds.

---

## Top Pre-App-Store Priorities by Impact
1. Add hosted privacy policy URL (required by Apple)
2. Add attribution/credits for translation + reciters (legal + religious accuracy)
3. Move backend off `*.replit.app` to a stable domain
4. Add Sentry for crash reporting
5. Resolve the legal-entity name mismatch
6. Remove dead deps (especially `openai`, `passport`, `drizzle`)
7. Delete the duplicate `bookmarks.ts`
8. Add aria-labels to `BottomNav`
9. Make timing-API failure non-fatal to playback
10. Add offline detection with `@capacitor/network`
