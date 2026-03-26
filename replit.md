# Overview

Tanzeel is a mobile-first Quran Reading application that provides users with an immersive experience to read, listen to, and study the Holy Quran. It features translations, transliterations, and audio recitation with word-level synchronized highlighting. Built with React, TypeScript, and shadcn/ui, it offers a modern, premium glassmorphism interface with adaptable light and dark themes, optimized for mobile. The application aims to deliver a highly functional and aesthetically pleasing digital Quran experience, enabling features like continuous chapter audio playback, customizable display settings, and robust bookmarking.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend uses React 18 with TypeScript and Vite, adopting a component-based architecture. UI is built with shadcn/ui (New York variant) and Tailwind CSS, focusing on a mobile-first design with a premium glassmorphism aesthetic that supports both light and dark themes. State management relies on React Hooks and React Query. Navigation is handled client-side across HomePage, SurahJuz, Bookmarks, and Settings screens. The design system ensures consistent premium glassmorphism across all UI elements, adapting seamlessly to themes with elegant shadows and gradient backgrounds. Headers use large, bold typography and circular action buttons.

### Mobile-First Responsive Design

All UI components utilize viewport-relative units for responsiveness, ensuring proper display and scrolling on various mobile screen sizes. This includes dropdowns, modals, spacing, and minimum 48px touch targets for accessibility.

### Layout System

All pages use a flex-based layout pattern: outer container is `flex flex-col h-[100dvh]`, headers are in-flow `shrink-0` elements with `header-safe-padding` for safe area insets, content areas use `flex-1 overflow-y-auto min-h-0`, and BottomNav is an in-flow `shrink-0` element with `safe-area-bottom`. The SurahJuz page features a collapsible header using `max-h`/`opacity` CSS transitions that animate sections in/out based on scroll position and search state. ChapterView is an exception where the header keeps `position: fixed` due to complex auto-hide/gradient behavior. iOS safe area handling uses `html::before` pseudo-element in `@layer base`, Capacitor `resize: 'none'` keyboard mode, and global `focusout`/`visualViewport` scroll reset in main.tsx.

### Accessibility Compliance

The application meets WCAG 2.1 standards through semantic HTML, comprehensive keyboard navigation with `focus-visible` styling, extensive ARIA labels for screen reader support, and optimized touch targets.

### Onboarding Experience

A first-time user onboarding flow guides users through initial setup. It includes a welcome screen highlighting features and a font customization screen with live previews for Arabic, transliteration, and translation text sizes. Preferences are persisted via localStorage.

### Theme System

A comprehensive light and dark theme system is implemented using CSS variables. Themes adapt automatically across all UI components using semantic tokens, maintaining a consistent premium glassmorphism aesthetic with responsive background gradients, card styling, text colors, borders, and shadows.

## Backend Architecture

The backend is an Express.js server in Node.js with TypeScript, providing a RESTful API, serving the production frontend, and proxying audio to resolve CORS issues. It uses an in-memory `IStorage` interface, designed for future database migration.

## Database Architecture

The application is configured with Drizzle ORM for PostgreSQL (via `@neondatabase/serverless`) and Drizzle Kit for migrations. It currently uses in-memory storage but is set up for serverless PostgreSQL.

## Audio Playback System

The system provides continuous chapter audio playback with word-level synchronized highlighting. Audio state is managed centrally via `AudioProvider` (`client/src/contexts/AudioContext.tsx`), which wraps `useWordTimingAudio` at the app level and exposes playback controls through the `useAudio()` hook. This enables persistent audio across navigation — a `MiniPlayer` component (`client/src/components/MiniPlayer.tsx`) shows a compact bar above the bottom nav when audio is playing and the user navigates away from ChapterView. The mini player displays the chapter name, progress bar, and play/pause control; tapping it navigates back to the playing chapter. ChapterView registers verse-change and ended callbacks via ref-based registration to handle auto-scroll and chapter-end navigation. Global playback speed is persistent via `localStorage`. The system supports 10 professional reciters from EveryAyah.com, with dynamic word and verse highlighting and auto-scrolling. The backend normalizes inconsistent Quran.com API responses for audio timing.

### Offline Playback (Verse-by-Verse)

Offline playback uses verse-by-verse (VBV) mode exclusively for instant start — no merge/decode step. When downloaded verses are available, the first verse plays immediately while the next 2 verses are preloaded in the background using a `Map<number, HTMLAudioElement>` ref. The preload system cleans up stale entries and prevents duplicate loads via double-checking the map before insertion. Word-level highlighting works in VBV mode via `vbvTimingsRef`. The old merge path (`client/src/lib/audioMerger.ts`) that decoded all MP3s into a single WAV blob has been removed from the playback flow for performance. On native platforms, `getCachedAudioUri` validates file existence via `Filesystem.stat()` before returning URIs; on web, `readFile` naturally throws for missing files.

### Audio Caching (Capacitor Filesystem)

A Capacitor Filesystem-based audio cache (`client/src/services/audioCache.ts`) stores verse-level MP3s with a dual-directory strategy:
- **Auto-cached files** (source `'cache'`): stored in `Directory.Cache` (`audio-cache/` folder), subject to LRU eviction when total size exceeds the configurable limit (default 2 GB).
- **Explicitly downloaded files** (source `'download'`): stored in `Directory.Data` (`audio-downloads/` folder), exempt from LRU eviction, only removed by explicit user action.
- A shared manifest (`audio-cache/manifest.json` in `Directory.Data`) tracks all entries with reciter/surah/verse keys, sizes, timestamps, and source type. Legacy manifest entries without a `source` field are normalized to `'cache'` on init.
- `cacheAudioFile()` returns `boolean` success status for callers to implement retry logic.
- `getCachedAudioUri()` resolves the correct directory based on entry source.

The legacy browser Cache API store (`client/src/lib/audioCache.ts`) still exists for backward compatibility but playback integration with the new Capacitor store is deferred.

### Audio Download Manager

`client/src/services/audioDownloadManager.ts` orchestrates bulk offline downloads:
- `downloadSurah(reciterId, surahNum, totalVerses, onProgress?)`: Downloads all verses for a surah sequentially with per-verse retry (2 attempts, 500ms delay) and cancellation support. Skips already-downloaded verses. Reports aggregate percent progress.
- `downloadAllSurahs(reciterId, onProgress?)`: Iterates all 114 surahs.
- `cancelDownload()`: Sets a flag checked between verse downloads.
- `deleteSurahDownload(reciterId, surahNum, totalVerses)`: Removes downloaded files for one surah.
- `deleteReciterDownloads(reciterId)`: Removes all downloaded files for a reciter.
- `getDownloadStatus(reciterId, surahNum, totalVerses)`: Returns `'none' | 'partial' | 'complete'`.
- Audio URLs constructed directly from EveryAyah.com pattern: `https://everyayah.com/data/{everyAyahFolder}/{SSS}{VVV}.mp3`.

### Audio Manager Page

`client/src/pages/AudioManager.tsx` — full-screen page accessible from Settings > Offline Storage > "Audio Manager":
- **Storage Summary**: Total audio storage, breakdown (auto-cached vs downloaded), cache limit pill selector.
- **Reciter Section**: Shows current reciter name, "Download All Surahs" button with estimated size (~2.2 GB), and list of all 114 surahs with download status icons (not downloaded / downloading spinner / complete / partial).
- **Download Progress**: Sticky progress bar at top with percentage and cancel button (shows "Cancelling..." state for immediate feedback).
- **Apple Compliance**: Confirmation dialogs before any download starts showing estimated size. "Download All" dialog warns about ~15-30 minute duration.
- **Delete Flow**: Tapping a downloaded surah shows delete confirmation dialog.
- Registered as page type `"audio-manager"` in App.tsx, Android back button returns to Settings.

## Haptic Feedback

A haptics utility (`client/src/lib/haptics.ts`) provides tactile feedback using Capacitor's Haptics plugin on native platforms and `navigator.vibrate()` as a web fallback. Two intensities: light (15ms / ImpactStyle.Light) for play/pause, bookmark, tab switch, speed change, and layout change; medium (40ms / ImpactStyle.Medium) for swipe navigation between surahs.

## Swipe Navigation

Horizontal swipe gestures in ChapterView allow navigating between surahs (left swipe → next, right swipe → previous). Thresholds: 75px horizontal distance, 100px max vertical tolerance, 600ms max duration. A floating pill indicator with the target surah name appears briefly before navigation. Disabled in Mushaf mode which uses horizontal swipe for page navigation.

## Reading Position Tracking

The reading stats system tracks verse-level position via scroll detection (debounced 500ms). When a user scrolls through verses, the visible verse at 40% viewport height is saved as `lastReadVerse`. The "Continue Reading" card on the Home page passes this verse number to ChapterView, which scrolls directly to that position on load.

## Bookmarking System

A customizable verse bookmarking system is implemented, stored in `localStorage`. It allows users to add/remove bookmarks, organize them into custom folders, add notes, and navigate directly to bookmarked verses. The system includes duplicate prevention for folder names and is integrated into `VerseCard` and a dedicated `Bookmarks` page.

## Search System

The SurahJuz page features a 3-layer search system triggered when users type 3+ characters:
1. **Surah Name Filtering**: Instant client-side filtering of chapter names (and meanings) with transliteration normalization
2. **Topic Index Matching**: Client-side keyword matching against 50+ curated Quranic themes (`client/src/lib/topicIndex.ts`)
3. **Full-Text Translation Search**: Server-side search across all 6,236 verse translations via `GET /api/search?q=<query>`. Results show highlighted matching text snippets. Search index is lazily loaded and cached in memory on first request. Returns up to 30 results.

When searching, the page title and tab switcher collapse to maximize screen space for results. Topic results show verse references with translation previews loaded on demand. Translation search results show highlighted matching text with context.

## Download Progress Badge

`client/src/lib/downloadState.ts` provides a lightweight pub/sub system for download activity state. AudioManager broadcasts download start/stop/cancel events. BottomNav subscribes and shows an animated pulsing dot on the Settings tab when a download is active, visible from any page.

## Screen Wake Lock

ChapterView uses the Web `Screen Wake Lock` API (`navigator.wakeLock`) to prevent the screen from dimming/locking during audio playback. The lock is acquired when playback starts and released when paused/stopped. It handles visibility changes to re-acquire the lock when the app returns to foreground.

## Data Management

Quran data (chapters, verses, Arabic text, English translations, transliterations) is statically stored client-side. User preferences (theme, reciter, speed, auto-scroll, repeat, autoplay) are managed using local storage. Word-level timing data is fetched dynamically from the Quran.com API.

# External Dependencies

- **Third-Party UI Libraries**: Radix UI Primitives, shadcn/ui, Embla Carousel, cmdk, lucide-react.
- **Styling & Utilities**: Tailwind CSS, class-variance-authority, clsx, tailwind-merge.
- **Forms & Validation**: React Hook Form, Zod, @hookform/resolvers.
- **Data Fetching & State**: TanStack Query (React Query).
- **Database & ORM**: Drizzle ORM, @neondatabase/serverless, connect-pg-simple.
- **Fonts**: Google Fonts — Scheherazade New (Uthmani/Tajweed primary), Amiri (fallback), Noto Nastaliq Urdu (IndoPak).
- **Tajweed Color System**: CSS colors for `<tajweed>` HTML tags map to the Quran.com V4 COLRv1 font's CPAL dark palette (palette index 1). Mapping: ham_wasl/slnt/laam_shamsiyah=#999999 [2], madda_normal=#ffc1e0 [5], madda_permissible=#ff5e8e [9], madda_obligatory=#ff8e3b [4], madda_necessary=#e30000 [3], ghunna/ikhfa=#26b55d [6], qalqala=#00deff [8], tafkhim=#3c84d5 [7]. Note: Quran.com's V4 COLR font additionally colors tafkhim (heavy) letters at the glyph level; these are not tagged by the HTML tajweed API and thus cannot be replicated via CSS alone.
- **External APIs & Data Sources**:
    - **Quran.com Audio API**: Provides continuous chapter audio files and word-level timing data via a backend proxy.
    - **Al-Quran Cloud API**: Used for pre-fetching static Quran text data (Arabic, Sahih International English translation, transliteration).
- **Mobile Deployment**: Capacitor for native iOS and Android app deployment, @capacitor/haptics for native haptic feedback, @capacitor/filesystem for local file storage, @capacitor/network for network status detection.