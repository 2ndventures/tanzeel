# Overview

Tanzeel is a mobile-first Quran Reading application designed to provide an immersive experience for reading, listening to, and studying the Holy Quran. It features translations, transliterations, and audio recitation with word-level synchronized highlighting. The application aims to deliver a highly functional and aesthetically pleasing digital Quran experience, optimized for mobile with a premium glassmorphism interface and adaptable light/dark themes. Key capabilities include continuous chapter audio playback, customizable display settings, and robust bookmarking.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend uses React 18 with TypeScript and Vite, employing a component-based architecture. UI is built with shadcn/ui and Tailwind CSS, prioritizing a mobile-first design with a premium glassmorphism aesthetic that supports both light and dark themes. State management is handled with React Hooks and React Query. The application ensures accessibility compliance through semantic HTML, keyboard navigation, ARIA labels, and optimized touch targets. A first-time user onboarding flow guides initial setup and font customization. A comprehensive light and dark theme system is implemented using CSS variables and a three-layered color system for consistent aesthetics.

## Backend Architecture

The backend is an Express.js server in Node.js with TypeScript, providing a RESTful API, serving the production frontend, and proxying audio requests to resolve CORS issues. It uses an in-memory storage interface, designed for future database migration.

## Database Architecture

The application is configured with Drizzle ORM for PostgreSQL and Drizzle Kit for migrations, currently utilizing in-memory storage but set up for serverless PostgreSQL.

## Audio Playback System

The system provides continuous chapter audio playback with word-level synchronized highlighting. Audio state is managed centrally, enabling persistent audio across navigation via a MiniPlayer component. It supports 10 professional reciters and includes platform-aware audio URL routing to optimize performance. Offline playback is supported via a verse-by-verse (VBV) mode with preloading, and an audio caching system using Capacitor Filesystem for storing MP3s in dual directories (auto-cached and explicitly downloaded). An Audio Download Manager orchestrates bulk offline downloads with retry and cancellation support, and a dedicated Audio Manager Page allows users to manage their downloads and view storage summaries.

## Page Transitions

The app utilizes a fluid page transition system with simultaneous exit and entry animations, employing parallax slides for deeper navigation and crossfades for same-depth pages or tab switches.

## Haptic Feedback

A haptics utility provides tactile feedback using Capacitor's Haptics plugin on native platforms and `navigator.vibrate()` as a web fallback, with light and medium intensities for different interactions.

## Swipe Navigation

Horizontal swipe gestures in ChapterView allow navigation between surahs, with a floating pill indicator briefly showing the target surah name. This is disabled in Mushaf mode.

## Reading Position Tracking

A reading stats system tracks verse-level position via scroll detection, saving the `lastReadVerse` to enable users to "Continue Reading" from their last position.

## Bookmarking System

A customizable verse bookmarking system stores bookmarks in `localStorage`, allowing users to add/remove, organize into folders, add notes, and navigate directly to bookmarked verses.

## Search System

The SurahJuz page features a 3-layer search system: Surah Name Filtering (client-side), Topic Index Matching (client-side), and Full-Text Translation Search (server-side across all verse translations). Search results show highlighted snippets and context.

## Download Progress Badge

A lightweight pub/sub system provides download activity state, displaying an animated pulsing dot on the Settings tab when a download is active.

## Screen Wake Lock

ChapterView uses the Web `Screen Wake Lock` API to prevent the screen from dimming/locking during audio playback.

## Error Monitoring (Sentry)

The app reports runtime errors to three separate Sentry projects:
- **Web** (`VITE_SENTRY_DSN_WEB`) via `@sentry/react` with browser tracing and on-error session replay (text masked, media blocked).
- **iOS native** (`VITE_SENTRY_DSN_IOS`) via `@sentry/capacitor` wrapping `@sentry/react`. The Capacitor plugin is registered in `ios/App/Podfile` (`SentryCapacitor` pod) and requires `pod install` on macOS after `npx cap sync ios`.
- **API** (`SENTRY_DSN_API`) via `@sentry/node` with `nodeProfilingIntegration`. Initialised in `server/instrument.ts` (imported first in `server/index.ts`); `Sentry.setupExpressErrorHandler(app)` runs after routes, before the custom error middleware.

`client/src/lib/sentry.ts` chooses the DSN based on `Capacitor.isNativePlatform()`. The shared React `ErrorBoundary` in `client/src/components/ErrorBoundary.tsx` forwards uncaught render errors via `Sentry.captureException`. A hidden verification endpoint `GET /api/_debug/sentry` deliberately throws to test backend reporting.

Note: full express auto-instrumentation requires running node/tsx with `--import ./server/instrument.ts`. Without that flag, error capture works but request-tracing spans are not auto-collected.

## Data Management

Quran data (chapters, verses, Arabic text, English translations, transliterations) is statically stored client-side. User preferences are managed using local storage. Word-level timing data is fetched dynamically.

The default reading translation is **Dr. Mustafa Khattab — "The Clear Quran"** (Allah edition, so the divine name renders as "Allah"). It is bundled into every chapter file's `translation` field, so reading works fully offline with no runtime API call. The text uses ornate brackets `˹…˺` for translator clarifications (intentional house style, preserved). Sourced from the freely-mirrored `fawazahmed0/quran-api` (`eng-mustafakhattaba`) because Quran.com's public API no longer serves this copyrighted edition. The one-time migration script is `scripts/apply-khattab-translation.mjs`. There is no in-app translation selector yet (possible future feature).

# External Dependencies

- **Third-Party UI Libraries**: Radix UI Primitives, shadcn/ui, Embla Carousel, cmdk, lucide-react.
- **Styling & Utilities**: Tailwind CSS, class-variance-authority, clsx, tailwind-merge.
- **Forms & Validation**: React Hook Form, Zod, @hookform/resolvers.
- **Data Fetching & State**: TanStack Query (React Query).
- **Database & ORM**: Drizzle ORM, @neondatabase/serverless.
- **Fonts**: Google Fonts (Scheherazade New, Amiri, Noto Nastaliq Urdu).
- **Tajweed Color System**: CSS colors for `<tajweed>` HTML tags mapping to Quran.com V4 COLRv1 font's CPAL dark palette.
- **External APIs & Data Sources**:
    - **Quran.com Audio API**: For continuous chapter audio and word-level timing data.
    - **Al-Quran Cloud API**: For static Quran text data (Arabic, transliteration) and the additional searchable English translations in the offline search corpus (Sahih International, Yusuf Ali, Pickthall, Shakir, Hilali & Khan).
    - **fawazahmed0/quran-api (jsDelivr CDN)**: Source of the default reading translation — Dr. Mustafa Khattab's "The Clear Quran" (Allah edition).
- **Mobile Deployment**: Capacitor for native iOS/Android, @capacitor/haptics, @capacitor/filesystem, @capacitor/network.