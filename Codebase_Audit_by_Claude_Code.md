# TANZEEL CODEBASE AUDIT

**Date:** April 20, 2026
**Auditor:** Claude Code (Opus 4.6)

---

## 1. IDENTITY & BRANDING

**Current app name:**
- `Info.plist` `CFBundleDisplayName`: **Tanzeel**
- `package.json` `name`: **rest-express** (generic Replit scaffold name, not the real app name)
- `capacitor.config.ts` `appName`: **Tanzeel**

**Current bundle ID / appId:**
- `capacitor.config.ts`: `com.tanzeelquran.app`
- `android/app/build.gradle`: `com.tanzeelquran.app`

**Other name references (inconsistencies):**

| Location | Value | Problem |
|---|---|---|
| `ios/App/App/capacitor.config.json` | `com.simplequran.app` | Stale built asset — old bundle ID |
| `android/app/src/main/assets/capacitor.config.json` | `com.simplequran.app` | Same stale built asset |
| `resources/README.md` | "Simple Quran logo design" | Old branding reference |
| `package.json` | `"name": "rest-express"` | Generic Replit name, not "tanzeel" |

The app was previously called "SimpleQuran" and was renamed to "Tanzeel". The generated platform assets were not re-synced after the rename (running `npx cap sync` would fix this).

---

## 2. BACKEND & HOSTING

**Production backend URL:**
From `client/src/config.ts:11,25`:
```
https://11424-newest-version-web266.replit.app
```

**It is still a Replit URL.** It has not been moved to a custom domain.

**No `.env` files exist.** All configuration is hardcoded.

**Every external domain the app calls:**

| Domain | Purpose | File(s) |
|---|---|---|
| `https://11424-newest-version-web266.replit.app` | Own backend (API proxy) | `client/src/config.ts` |
| `https://download.quranicaudio.com` | Full chapter MP3 audio CDN | `client/src/lib/audioUrls.ts`, `server/routes.ts` |
| `https://everyayah.com` | Verse-by-verse MP3 audio CDN | `client/src/lib/audioUrls.ts`, `server/routes.ts` |
| `https://api.qurancdn.com` | Word-level timing/segments data | `client/src/lib/audioUrls.ts`, `server/routes.ts` |
| `https://api.quran.com` | IndoPak/Tajweed text, tafsir | `server/routes.ts` |
| `https://formspree.io` | User feedback form submission | `client/src/pages/Settings.tsx:187` |

**CDN fallback/retry strategy — YES, exists:**

1. **Server-side reciter fallback** (`server/routes.ts:123-129`): If a reciter's audio returns non-200, falls back to Mishari Al-Afasy.
2. **Client download retry** (`client/src/services/audioDownloadManager.ts:75-85`): 2 attempts with 500ms delay between.
3. **Audio playback retry** (`client/src/hooks/useWordTimingAudio.ts:850-876`): Exponential backoff (1s, 2s, max 4s) for up to `MAX_AUTO_RETRIES = 2`, then falls back to verse-by-verse mode.

---

## 3. DEPENDENCIES

**Full `dependencies` from `package.json`:**

```json
"@capacitor/android": "^7.4.4",
"@capacitor/cli": "^7.4.4",
"@capacitor/core": "^7.4.4",
"@capacitor/filesystem": "^7.1.8",
"@capacitor/haptics": "^7.0.3",
"@capacitor/ios": "^7.4.4",
"@capacitor/keyboard": "^7.0.5",
"@capacitor/network": "^7.0.4",
"@capacitor/preferences": "^7.0.0",
"@capgo/native-audio": "^7.9.2",
"@hookform/resolvers": "^3.10.0",
"@iconify/react": "^6.0.2",
"@jridgewell/trace-mapping": "^0.3.25",
"@neondatabase/serverless": "^0.10.4",
"@radix-ui/react-accordion": "^1.2.4",
"@radix-ui/react-alert-dialog": "^1.1.7",
"@radix-ui/react-aspect-ratio": "^1.1.3",
"@radix-ui/react-avatar": "^1.1.4",
"@radix-ui/react-checkbox": "^1.1.5",
"@radix-ui/react-collapsible": "^1.1.4",
"@radix-ui/react-context-menu": "^2.2.7",
"@radix-ui/react-dialog": "^1.1.7",
"@radix-ui/react-dropdown-menu": "^2.1.7",
"@radix-ui/react-hover-card": "^1.1.7",
"@radix-ui/react-label": "^2.1.3",
"@radix-ui/react-menubar": "^1.1.7",
"@radix-ui/react-navigation-menu": "^1.2.6",
"@radix-ui/react-popover": "^1.1.7",
"@radix-ui/react-progress": "^1.1.3",
"@radix-ui/react-radio-group": "^1.2.4",
"@radix-ui/react-scroll-area": "^1.2.4",
"@radix-ui/react-select": "^2.1.7",
"@radix-ui/react-separator": "^1.1.3",
"@radix-ui/react-slider": "^1.2.4",
"@radix-ui/react-slot": "^1.2.0",
"@radix-ui/react-switch": "^1.1.4",
"@radix-ui/react-tabs": "^1.1.4",
"@radix-ui/react-toast": "^1.2.7",
"@radix-ui/react-toggle": "^1.1.3",
"@radix-ui/react-toggle-group": "^1.1.3",
"@radix-ui/react-tooltip": "^1.2.0",
"@tanstack/react-query": "^5.60.5",
"class-variance-authority": "^0.7.1",
"clsx": "^2.1.1",
"cmdk": "^1.1.1",
"connect-pg-simple": "^10.0.0",
"date-fns": "^3.6.0",
"drizzle-orm": "^0.39.1",
"drizzle-zod": "^0.7.1",
"embla-carousel-react": "^8.6.0",
"express": "^4.21.2",
"express-session": "^1.18.1",
"framer-motion": "^11.13.1",
"input-otp": "^1.4.2",
"jimp": "^1.6.1",
"lucide-react": "^0.453.0",
"memorystore": "^1.6.7",
"next-themes": "^0.4.6",
"openai": "^6.22.0",
"p-limit": "^7.3.0",
"p-retry": "^7.1.1",
"passport": "^0.7.0",
"passport-local": "^1.0.0",
"react": "^18.3.1",
"react-day-picker": "^8.10.1",
"react-dom": "^18.3.1",
"react-hook-form": "^7.55.0",
"react-icons": "^5.4.0",
"react-resizable-panels": "^2.1.7",
"recharts": "^2.15.2",
"tailwind-merge": "^2.6.0",
"tailwindcss-animate": "^1.0.7",
"tw-animate-css": "^1.2.5",
"vaul": "^1.1.2",
"wouter": "^3.3.5",
"ws": "^8.18.0",
"zod": "^3.25.76",
"zod-validation-error": "^3.5.4"
```

**Full `devDependencies`:**

```json
"@replit/vite-plugin-cartographer": "^0.4.1",
"@replit/vite-plugin-dev-banner": "^0.1.1",
"@replit/vite-plugin-runtime-error-modal": "^0.0.3",
"@tailwindcss/typography": "^0.5.15",
"@tailwindcss/vite": "^4.1.3",
"@types/connect-pg-simple": "^7.0.3",
"@types/express": "4.17.21",
"@types/express-session": "^1.18.0",
"@types/node": "20.16.11",
"@types/passport": "^1.0.16",
"@types/passport-local": "^1.0.38",
"@types/react": "^18.3.11",
"@types/react-dom": "^18.3.1",
"@types/ws": "^8.5.13",
"@vitejs/plugin-react": "^4.7.0",
"autoprefixer": "^10.4.20",
"drizzle-kit": "^0.31.4",
"esbuild": "^0.25.0",
"postcss": "^8.4.47",
"tailwindcss": "^3.4.17",
"tsx": "^4.20.5",
"typescript": "5.6.3",
"vite": "^5.4.20"
```

**Dead dependencies (installed but NEVER imported in `client/` or `server/`):**

| Package | Why it's here |
|---|---|
| `@capgo/native-audio` | **Not used.** Zero imports. |
| `@neondatabase/serverless` | **Not used.** Planned DB never built. |
| `drizzle-orm` / `drizzle-zod` | **Not used.** Only referenced in `db:push` script. |
| `connect-pg-simple` | **Not used.** |
| `passport` / `passport-local` | **Not used.** Auth was never implemented. |
| `express-session` | **Not used.** |
| `memorystore` | **Not used.** |
| `openai` | **Not used.** Planned AI feature never built. |
| `jimp` | **Not used.** |
| `date-fns` | **Not used.** |
| `framer-motion` | **Not used.** |
| `react-hook-form` / `@hookform/resolvers` | **Not used.** |
| `react-icons` | **Not used** (app uses `@iconify/react` and `lucide-react`). |
| `zod` / `zod-validation-error` | **Not used.** |
| `wouter` | **Not used** (app uses custom page state, not a router). |
| `next-themes` | **Not used.** |
| `p-limit` / `p-retry` | **Not used.** |
| `@capacitor/network` | Installed but **never imported**. |

That's ~22 dead production dependencies. They bloat `node_modules` and increase supply-chain attack surface.

**Specifically asked packages:**

| Package | Used? |
|---|---|
| `@capgo/native-audio` | NO — zero imports |
| `drizzle-orm` | NO — only in npm script |
| `@neondatabase/serverless` | NO — zero imports |
| `passport` / `passport-local` | NO — zero imports |
| `express-session` | NO — zero imports |
| `openai` | NO — zero imports |
| `jimp` | NO — zero imports |

---

## 4. CONTENT SOURCES & LICENSING

**Arabic Quran text source:**
The JSON files (`public/data/chapters/1.json` through `114.json`) contain Uthmani script Arabic text. A `verification_report.txt` confirms verses were verified against the **Quran.com API v4 (Uthmani script)**. There is no README, credit comment, or attribution file in the `public/data/` directory identifying the original source.

**English translation source:**
Based on phrasing (e.g., "the Entirely Merciful, the Especially Merciful"), this is the **Saheeh International** translation. However, **the translator is never explicitly named** anywhere in the data files, code, or documentation.

**License files:**
**No LICENSE, CREDITS, or ATTRIBUTION file exists** at the project root. `package.json` says `"license": "MIT"` (applies to app code only). There is zero documentation of content licensing.

**Reciters (from `client/src/lib/reciters.ts`):**

| ID | Name | Style | CDN Folder (everyayah.com) |
|---|---|---|---|
| `alafasy` | Mishary Rashid Alafasy | Murattal | `Alafasy_128kbps` |
| `abdul_basit` | Abdul Basit Abdul Samad | Murattal | `Abdul_Basit_Murattal_192kbps` |
| `abdul_basit_mujawwad` | Abdul Basit Abdul Samad | Mujawwad | `Abdul_Basit_Mujawwad_128kbps` |
| `sudais` | Abdurrahmaan As-Sudais | Murattal | `Abdurrahmaan_As-Sudais_192kbps` |
| `ash_shaatree` | Abu Bakr Ash-Shaatree | Murattal | `Abu_Bakr_Ash-Shaatree_128kbps` |
| `hudhaify` | Ali Al-Hudhaify | Murattal | `Hudhaify_128kbps` |
| `hani_rifai` | Hani Rifai | Murattal | `Hani_Rifai_192kbps` |
| `akram_alalaqimy` | Akram Al-Alaqimy | Murattal | `Akram_AlAlaqimy_128kbps` |

All verse audio: `https://everyayah.com/data/{folder}/{SSSAAA}.mp3`
Full chapter audio: `https://download.quranicaudio.com/qdc/{path}/{chapter}.mp3`
Timing data: `https://api.qurancdn.com/api/qdc/audio/reciters/{id}/audio_files?chapter={chapter}&segments=true`

**Written licensing/permission documentation:** **None exists.** The ToS (line 89-90) says "Quranic text, translations, and audio recitations are provided by third-party sources and remain the intellectual property of their respective owners" but there is no formal license agreement, API key documentation, or permission record from Quran.com, EveryAyah.com, or the Saheeh International translators.

---

## 5. iOS / APPLE COMPLIANCE

### PrivacyInfo.xcprivacy — EXISTS

**File:** `ios/App/App/PrivacyInfo.xcprivacy`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyCollectedDataTypes</key>
  <array/>
  <key>NSPrivacyTracking</key>
  <false/>
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>C617.1</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
```

Declares: no data collection, no tracking, one API access (FileTimestamp, reason C617.1).

### Capacitor webDir privacy manifest

Not present in `dist/public/`. Capacitor's own framework includes privacy manifests in its pods (`node_modules/@capacitor/ios/`).

### Info.plist — Full Contents

**File:** `ios/App/App/Info.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>Tanzeel</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>LSRequiresIPhoneOS</key>
  <true/>
  <key>UILaunchStoryboardName</key>
  <string>LaunchScreen</string>
  <key>UIMainStoryboardFile</key>
  <string>Main</string>
  <key>UIRequiredDeviceCapabilities</key>
  <array>
    <string>armv7</string>
  </array>
  <key>UISupportedInterfaceOrientations</key>
  <array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
  </array>
  <key>UISupportedInterfaceOrientations~ipad</key>
  <array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationPortraitUpsideDown</string>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
  </array>
  <key>UIViewControllerBasedStatusBarAppearance</key>
  <true/>
  <key>UIBackgroundModes</key>
  <array>
    <string>audio</string>
  </array>
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSExceptionDomains</key>
    <dict>
      <key>quran.com</key>
      <dict>
        <key>NSIncludesSubdomains</key>
        <true/>
        <key>NSExceptionAllowsInsecureHTTPLoads</key>
        <false/>
        <key>NSExceptionRequiresForwardSecrecy</key>
        <true/>
      </dict>
      <key>everyayah.com</key>
      <dict>
        <key>NSIncludesSubdomains</key>
        <true/>
        <key>NSExceptionAllowsInsecureHTTPLoads</key>
        <false/>
        <key>NSExceptionRequiresForwardSecrecy</key>
        <true/>
      </dict>
      <key>replit.app</key>
      <dict>
        <key>NSIncludesSubdomains</key>
        <true/>
        <key>NSExceptionAllowsInsecureHTTPLoads</key>
        <false/>
        <key>NSExceptionRequiresForwardSecrecy</key>
        <true/>
      </dict>
    </dict>
  </dict>
</dict>
</plist>
```

### Xcode Project Versions

- **MARKETING_VERSION:** 1.0
- **CURRENT_PROJECT_VERSION:** 1
- **Bundle Identifier:** com.tanzeelquran.app
- **Deployment Target:** iOS 14.0
- **Code Sign Style:** Automatic
- **Targeted Devices:** iPhone and iPad (1,2)

### AppIcon Set

`ios/App/App/Assets.xcassets/AppIcon.appiconset/` contains:
- **One file:** `AppIcon.png` (1024x1024, universal iOS format, 13KB)
- Modern Xcode auto-generates required sizes from the single 1024x1024 asset.

### Launch Screen

YES — `LaunchScreen.storyboard` configured with a `Splash` image (1366x1366), `scaleAspectFill`, white background.

### Entitlements

No `.entitlements` file. Code signing is set to `Automatic`.

---

## 6. CRASH REPORTING & ANALYTICS

**Crash reporting:** **NONE.** No Sentry, Crashlytics, Bugsnag, Rollbar, or any other crash reporting tool is installed or configured.

**Analytics:** **NONE.** No PostHog, Mixpanel, Firebase Analytics, Amplitude, TelemetryDeck, or any analytics SDK.

**ErrorBoundary:** YES — exists at `client/src/components/ErrorBoundary.tsx` and **wraps the entire app** in `client/src/App.tsx:484`:

```tsx
<ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    ...
  </QueryClientProvider>
</ErrorBoundary>
```

It catches React component errors, logs to `console.error`, and shows a "Something went wrong" screen with a "Reload App" button.

**Error logging:** **Console-only.** Every error handler in the codebase uses `console.error()` or `console.warn()`. There is no durable error storage, no remote logging endpoint, no error aggregation. Errors are lost when the console clears.

---

## 7. DATA MODEL & FUTURE-PROOFING

**Bookmark data structure** (`client/src/lib/bookmarkService.ts:3-10`):

```typescript
export interface Bookmark {
  id: string;          // Format: "chapterId:verseNumber"
  chapterId: number;
  verseNumber: number;
  folder: string;      // Custom folder name (default: "Favorites")
  note: string;        // User notes
  createdAt: number;   // Date.now() in milliseconds
}
```

**ID type:** Composite sequential string (`"1:5"`), **not UUIDs**. This means one bookmark per verse maximum.

**Timestamps:** `createdAt` only. **No `updatedAt`.**

**userId field:** **No.** All records are user-agnostic local data.

**Storage locations (all via Capacitor Preferences on native, localStorage on web):**

| Key | Purpose |
|---|---|
| `quran_bookmarks` | Bookmark array (JSON) |
| `quran_bookmark_folders` | Folder names array (JSON) |
| `quran-reading-stats` | Reading streak, verses read, etc. (JSON) |
| `quran-playback-speed` | Global speed (float string) |
| `pendingDownload` | Resume interrupted downloads (JSON) |
| `onboardingCompleted` | Boolean |
| `darkMode` | Boolean |
| `arabicScript` | "uthmani" / "indopak" / "tajweed" |
| `reciter` | Reciter ID string |
| `autoScroll` / `repeat` / `autoplay` | Boolean toggles |
| `layoutMode` | "standard" / "focused-flow" / "mushaf" |
| `arabicFontSize` / `translationFontSize` / `transliterationFontSize` | Size name strings |
| `lineSpacing` | "Normal" / "Compact" / "Relaxed" / "Loose" |
| `showVerseNumbers` | Boolean |
| `translation` | Language string |
| `__storage_migrated_v1` / `__storage_migrated_v2` / `toggleMigrationDone` | Migration flags |

---

## 8. AUDIO / OFFLINE

**Does audio caching work end-to-end?** YES. The full code path:

1. **Trigger:** `AudioManager.tsx:handleDownloadSurah()` calls `downloadSurah()` in `audioDownloadManager.ts`
2. **Download:** `saveFullChapterAudio()` in `audioCache.ts` uses XHR with progress events to download the MP3
3. **Write:** `Filesystem.writeFile()` saves to `audio-downloads/{reciterId}/chapter_{surahNum}.mp3` in `Directory.Data`
4. **Timing:** Timing JSON fetched from Quran.com API and saved to `audio-downloads/{reciterId}/timing_{surahNum}.json`
5. **Manifest:** Entry added to in-memory manifest with path, size, timestamps; manifest persisted via `saveManifest()`
6. **Playback:** `useWordTimingAudio.ts:596` checks `isFullChapterDownloaded()`, gets URI via `getFullChapterAudioUri()` which calls `Capacitor.convertFileSrc()` for native or returns base64 data URI for web
7. **Resume:** Pending downloads saved to `pendingDownload` key and checked on app mount for interrupted downloads

**Can users delete downloaded audio?** YES.
- Per-surah: `AudioManager.tsx:handleDeleteSurah()` → `audioDownloadManager.ts:deleteSurahDownload()` — deletes chapter MP3, verse MP3s, timing JSON, and manifest entries
- Per-reciter: `deleteReciterDownloads()` — bulk deletion of all files for a reciter

**Storage-used indicator:** YES.
- `AudioManager.tsx:244` displays total downloaded bytes formatted via `formatBytes()`
- `Settings.tsx:497` also shows `"{X} MB downloaded"`
- Per-surah sizes shown in the download manager list

**What happens on out-of-space?** Generic `catch` block in `audioCache.ts:306-309` logs `console.error` and returns `false`. **No specific `QuotaExceededError` handling, no pre-download space check, no user-friendly "storage full" message.** The download just fails silently and retries once.

---

## 9. ERROR HANDLING & UX EDGE CASES

**Audio CDN 404/timeout:**
`useWordTimingAudio.ts:850-876` — exponential backoff retry (2 attempts, 1s/2s delays), then falls back to verse-by-verse mode via `tryVerseByVerseFallback()`. If that also fails, sets `error: 'Audio failed to load. Tap retry to try again.'` which displays in the AudioPlayer UI.

**Timing API failure:**
Audio **still plays** without word highlighting. Timing is fetched asynchronously in the background (`useWordTimingAudio.ts:928+`). If it fails, it retries with the same exponential backoff, then falls back to verse-by-verse. The user is not explicitly told timing failed — highlighting just doesn't appear.

**Offline detection with `@capacitor/network`:**
**Not used.** `@capacitor/network` is installed in `package.json` but **never imported anywhere**. There is no proactive offline detection. Offline handling is purely reactive — if a network call fails, the error handler fires. Downloaded content plays from cache silently.

**Loading/error state coverage:**
- AudioPlayer: has `isLoading` spinner, `error` text display, retry button
- ChapterView: has `isLoadingVerses`, `versesError` state with error message
- Silent failures exist: `audio.play().catch(() => {})` at `useWordTimingAudio.ts:968`, `saveManifest().catch(() => {})` at 4 locations in `audioCache.ts`, `Preferences.set().catch(() => {})` in `storage.ts:135`
- Toast infrastructure exists (`use-toast.ts`) but is **never actually used** for error notifications

---

## 10. DEAD CODE & HYGIENE

**Dead UI components (22 unused shadcn/ui files in `client/src/components/ui/`):**

`accordion.tsx`, `alert-dialog.tsx`, `aspect-ratio.tsx`, `avatar.tsx`, `breadcrumb.tsx`, `calendar.tsx`, `chart.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `hover-card.tsx`, `input-otp.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `pagination.tsx`, `radio-group.tsx`, `resizable.tsx`, `scroll-area.tsx`, `theme-toggle.tsx`, `toaster.tsx`, `toggle-group.tsx`

**`shared/schema.ts`:** The `shared/` directory **does not exist**. The reference in `drizzle.config.ts` points to a non-existent file.

**`server/storage.ts`:** Yes, still an empty interface:

```typescript
export interface IStorage {}
export class MemStorage implements IStorage { constructor() {} }
export const storage = new MemStorage();
```

**TODO/FIXME/HACK comments:** **Zero found** across all source files. The codebase is clean in this regard.

**No `.bak` files, no empty files, no commented-out code blocks found.**

---

## 11. TESTING

**Tests:** **None.** Zero `*.test.ts`, `*.spec.ts`, or `__tests__/` directories. No vitest, jest, playwright, or cypress configuration.

**Test script in `package.json`:** **None.** Available scripts are:
- `dev` — start dev server
- `build` — vite build + esbuild
- `start` — production server
- `check` — TypeScript type check only
- `db:push` — drizzle-kit push (non-functional, no DB)

---

## 12. BUILD & DEPLOYMENT

**Build scripts:**

```json
"dev": "NODE_ENV=development tsx server/index.ts",
"build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
"start": "NODE_ENV=production node dist/index.js",
"check": "tsc"
```

**CI/CD:** **None.** No `.github/workflows/`, no `.gitlab-ci.yml`, no Fastlane, no Xcode Cloud config.

**TestFlight setup:** **Partial.** The Xcode project has `CODE_SIGN_STYLE = Automatic` and `ProvisioningStyle = Automatic`, meaning it will use whatever Apple ID is signed in to Xcode. No provisioning profiles are committed to the repo. No export options plist exists. You would need to open in Xcode, sign in with an Apple Developer account, and archive manually.

---

## 13. PRIVACY POLICY & LEGAL

### Privacy Policy (`client/src/pages/PrivacyPolicy.tsx`)

- **Last Updated:** November 14, 2025
- **Company:** 2nd Ventures, LLC
- **Key Claims:**
  - Zero data collection — all data stored locally on device
  - Third-party service: Quran.com API (exposes IP address when streaming audio)
  - In-app purchases processed via App Store / Play Store (future)
  - Children's privacy: suitable for all ages, no data collected
  - GDPR and CCPA compliance sections included
- **Contact:** support@thirdventures.com

### Terms of Service (`client/src/pages/TermsOfService.tsx`)

- **Last Updated:** November 14, 2025
- **Company:** 2nd Ventures, LLC
- **Key Terms:**
  - Limited, non-exclusive, non-transferable license for personal use
  - Restrictions on copying, reverse engineering, distribution
  - IP owned by 2nd Ventures, LLC; Quranic content owned by third parties
  - Purchases final and non-refundable (except as required by law)
  - Disclaimer of warranties (AS IS / AS AVAILABLE)
  - Liability cap: $100
  - Governing law: State of Delaware
  - Dispute resolution: informal negotiation, then binding AAA arbitration
  - Class action waiver
- **Contact:** support@thirdventures.com

### Hosted Public URL

**None.** Both documents are embedded React components accessible only from within the app (Settings > Legal). Apple requires a publicly accessible URL during App Store submission.

### Support Email

`support@thirdventures.com` — found in PrivacyPolicy.tsx:154 and TermsOfService.tsx:195,244.

---

## 14. ACCESSIBILITY

### VerseCard (`client/src/components/VerseCard.tsx`)
- Has `aria-label` with verse reference and play state (line 172)
- Has `aria-current` for highlighted verse (line 171)
- Has `role="button"` (line 173)
- Has `tabIndex={0}` and keyboard handlers for Enter/Space (lines 155-160, 174)
- Bookmark button has conditional `aria-label` (line 198)

### AudioPlayer (`client/src/components/AudioPlayer.tsx`)
- Good coverage: `aria-label` on play/pause, skip, speed buttons
- Speed menu has `role="menu"`, `aria-haspopup`, `aria-expanded`, `role="menuitemradio"`, `aria-checked`
- Decorative icons have `aria-hidden="true"`
- Loading spinner has `role="status" aria-label="Loading"`

### BottomNav (`client/src/components/BottomNav.tsx`)
- **Missing `aria-label`** on navigation buttons
- **Missing `role="navigation"`** on the nav container
- **Missing `aria-current="page"`** for the active tab
- Touch targets meet minimum 48x48px (line 54: `min-h-[48px] min-w-[48px]`)

### Dynamic Type
**Partial.** Most text uses Tailwind rem-based classes (`text-sm`, `text-lg`, etc.) which scale with system font size. However, several components use hardcoded pixel values that **do not respect Dynamic Type**:
- `text-[10px]` — BottomNav:72, AudioPlayer:382
- `text-[11px]` — AudioPlayer:111, 348, 351

### VoiceOver
UNKNOWN. No VoiceOver-specific testing evidence, no `aria-live` regions for dynamic content changes, no custom VoiceOver announcements. The ARIA labels on VerseCard and AudioPlayer would provide basic VoiceOver support, but the experience hasn't been validated.

---

## 15. ANYTHING I DIDN'T ASK

Issues relevant to shipping on the App Store:

1. **No public privacy policy URL.** Apple requires a publicly hosted privacy policy URL during App Store Connect submission. The current policy is only accessible inside the app.

2. **Bundle ID mismatch in built assets.** `ios/App/App/capacitor.config.json` still says `com.simplequran.app`. Run `npx cap sync` before building, or the native app may have identity confusion.

3. **Company name inconsistency.** The legal entity is "2nd Ventures, LLC" but the support email domain is `thirdventures.com`. This could raise questions during App Review.

4. **Backend on Replit free/autoscale tier.** A `replit.app` URL as a production backend for a shipped App Store app is risky — cold starts, potential downtime, rate limits, no SLA. Apple Review tests network calls and may reject if the backend is slow or down during review.

5. **No `@capacitor/network` usage despite installation.** The app has no proactive offline handling. If a user opens the app in airplane mode without cached data, they'll see loading spinners or generic errors rather than a clear "You're offline" state.

6. **No crash reporting.** Once in production on thousands of devices, you'll have zero visibility into crashes. Sentry or Crashlytics should be added before shipping.

7. **No analytics.** You'll have no visibility into which features are used, retention, or funnel metrics.

8. **~22 dead npm dependencies** including `openai`, `passport`, `drizzle-orm`, etc. — these add unnecessary weight and attack surface. Clean them out.

9. **22 unused UI component files** bloat the client bundle. Tree-shaking may handle some, but they still add to maintenance noise.

10. **The `server/storage.ts` empty interface and non-existent `shared/schema.ts`** suggest abandoned architecture. The `db:push` script would fail. Remove these dead references.

11. **Missing explicit content attribution.** Saheeh International translation is likely being used without crediting the translator. Quran.com and EveryAyah.com APIs are being used without any visible attribution or documented API usage agreement. Both sites have terms of use that may require attribution.

12. **`@capgo/native-audio` is installed but unused.** The app uses HTML5 `<audio>` elements instead. This dead Capacitor plugin adds native binary weight to the iOS/Android builds for nothing.

13. **No `updatedAt` on bookmarks.** If you ever add sync/cloud backup, you'll need conflict resolution timestamps. Adding `updatedAt` now is cheap.

14. **Formspree for feedback.** The free tier has submission limits. Consider whether this will scale.

15. **MARKETING_VERSION is 1.0 / build 1.** Make sure this is intentional before your first TestFlight upload — you can never reuse a build number for the same version.

16. **No rate limiting on the Express server.** The backend proxies all external API calls. Without rate limiting, it's vulnerable to abuse that could get your IP blocked by Quran.com or EveryAyah.com.

17. **CORS is `Access-Control-Allow-Origin: *`.** This is fine for a read-only Quran API but worth tightening if you ever add user accounts.
