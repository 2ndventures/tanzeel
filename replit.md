# Overview

This mobile-first Quran Reading application enables users to read, listen to, and study the Holy Quran with translations, transliterations, and audio recitation. It features a modern, dark-themed interface built with React, TypeScript, and shadcn/ui. Key capabilities include chapter browsing, verse-by-verse reading with synchronized audio (karaoke-style highlighting), customizable display settings, and bookmarking. The primary focus is on delivering an optimized mobile experience.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend uses React 18 with TypeScript and Vite, following a component-based architecture. UI is built with shadcn/ui (New York variant) and styled using Tailwind CSS, emphasizing a dark-themed, mobile-first design. State management is handled with React Hooks for local state and React Query for server state. Client-side navigation uses a simple page state system with three main screens:

1. **HomePage** (`/pages/HomePage.tsx`): Simple landing screen with app title, "Start Reading" button, and bottom navigation
2. **SurahJuz** (`/pages/SurahJuz.tsx`): Chapter list with search functionality, displays all 114 surahs
3. **Settings** (`/pages/Settings.tsx`): Application settings and preferences

Navigation flow: Home → Surah/Juz → Chapter View (reading screen). Bottom navigation allows switching between Home, Surah/Juz, and Settings tabs. ChapterView back button returns to Surah/Juz; Settings back button returns to Home.

Key patterns include Compound Components, Custom Hooks (e.g., `useAudioPlayer`, `useIsMobile`), and Controlled Components.

## Backend Architecture

The backend is an Express.js server running on Node.js with TypeScript. It provides a RESTful API and serves the production frontend. Data storage currently uses an in-memory solution (`MemStorage`) via an `IStorage` interface, designed for easy migration to a database. The server handles audio proxying to resolve CORS issues for the audio CDN.

## Database Architecture

The application is configured with Drizzle ORM for PostgreSQL (via `@neondatabase/serverless`). The schema is defined in `shared/schema.ts`, including a `users` table with Zod validation. Drizzle Kit handles migrations. The system is set up to use Neon (serverless PostgreSQL) but currently relies on in-memory storage, with future plans to fully integrate the database.

## Audio Playback System

A custom `useAudioPlayer` hook manages audio state, playback controls, and verse synchronization. It supports play/pause, seeking, playback speed adjustment, verse-timestamp synchronization for karaoke-style highlighting, repeat functionality, auto-scroll, and prev/next verse navigation. 

### Audio Streaming System
The application implements **HTTP Range Request streaming** (similar to Spotify) for instant audio playback, allowing long chapters (30-60MB) to start playing immediately without full download. The backend proxy at `/api/audio/{reciter}/{chapter}` supports:

- **Progressive Download**: Forwards Range headers from browser to CDN, enabling chunked audio delivery
- **206 Partial Content**: Properly handles partial content responses for streaming
- **Backpressure Handling**: Uses Node.js `stream.pipeline()` for efficient memory usage
- **Error Recovery**: Graceful handling of CDN failures and client disconnects
- **Cache Optimization**: Forwards CDN cache headers (Cache-Control, ETag) for client-side caching
- **Edge Case Handling**: Properly forwards 416 Range Not Satisfiable responses

### Reciter System
The application supports **10 professional reciters** from the Islamic Network CDN, all with complete surah-level audio files at 128kbps quality. All reciter IDs have been verified against the CDN manifest. Eight featured reciters are prominently displayed in the UI:

**Featured Reciters:**
1. **Mishary Rashid Alafasy** (ar.alafasy) - Murattal - Default
2. **Abdul Basit Abdul Samad** (ar.abdulbasitmurattal) - Murattal
3. **Mohamed Siddiq El-Minshawi** (ar.muhammadsiddiqalminshawimujawwad) - Mujawwad
4. **Saud Al-Shuraim** (ar.saudalshuraim) - Murattal
5. **Abdul Bari Mohammed** (ar.abdulbarimohammed) - Murattal
6. **Yasser Al-Dosari** (ar.yasseraldossari) - Murattal
7. **Ibrahim Al-Dosari** (ar.ibrahimaldossari) - Murattal
8. **Nasser Al-Qatami** (ar.nasseralqatami) - Murattal

Reciter metadata is defined in `client/src/lib/reciters.ts` with display names, Arabic names, recitation styles, and verified Islamic Network CDN identifiers. Selected reciter persists in localStorage with robust backward compatibility:
- Legacy string names ("Alafasy", "Sudais", "Ghamadi") are automatically migrated to proper API identifiers
- Old incorrect API IDs (ar.abdulbasit, ar.husary, ar.minshawi, ar.saadalghamidi, ar.mahermuaiqly, ar.abdurrahmaansudais) are migrated to valid alternatives
- Invalid or removed reciter IDs are validated and reset to default
- Whitespace is trimmed from saved values
- Migration is logged to console for debugging

Users can select reciters from:
1. **ChapterView menu**: Three-dot menu → Reciter submenu with checkmarks
2. **Settings page**: Audio section → Reciter dropdown

Audio sources are from the Islamic Network CDN at `https://cdn.islamic.network/quran/audio-surah/128/{reciter}/{chapter}.mp3`, proxied through the backend to prevent CORS issues. The system handles "A'udhu billahi" as audio-only preamble, not displayed as a verse.

### Verse Timestamp Synchronization System
The application uses a **hybrid approach with smart fallback** for accurate verse-by-verse highlighting:

- **Audio Source**: Islamic Network CDN (128kbps quality)
- **Timestamp Source**: MP3Quran.net API (`/api/v3/ayat_timing?surah={chapter}&read={mp3QuranId}`)
- **Reciter Mapping**: Each reciter has two identifiers:
  - `id`: Islamic Network identifier for audio (e.g., "ar.alafasy")
  - `mp3QuranId`: MP3Quran numeric ID for timestamps

**Verified MP3Quran Mappings (Direct Data):**
- Abdul Basit Abdul Samad → ID 53 (verified Murattal)
- Mohamed Siddiq El-Minshawi → ID 112 (verified Mujawwad)
- Saud Al-Shuraim → ID 31 (verified Murattal)

**Proxy Timestamp Mappings (7 reciters use similar reciter's timestamps):**
- Mishary Alafasy → uses ID 31 (Saud Al-Shuraim - similar Murattal style)
- Abdul Bari Mohammed → uses ID 53 (Abdul Basit - similar speed)
- Yasser Al-Dosari, Ibrahim Al-Dosari, Nasser Al-Qatami, Khaled Al-Qahtani, Waleed Al-Naehi → use ID 31 (similar Murattal style)

**Dynamic Timestamp Fetching:**
- When users select a chapter or change reciters, the app fetches timestamps with millisecond precision from MP3Quran
- API returns `{ayah, start_time, end_time}` in milliseconds, converted to seconds
- Falls back to approximate timing (8 sec/verse average) if API fetch fails
- Console logs: `📡 Fetching timestamps for {name} (ID: {mp3QuranId})` → `✓ Loaded {count} verse timestamps`

**Special Handling:**
- Chapter 9 (At-Tawbah) has no Bismillah preamble
- Preamble (verse 0) represents "A'udhu billahi" audio intro
- All 10 reciters have working timestamp data (3 direct, 7 proxy)
- Verse click-to-seek functionality uses timestamps to jump to specific verses

## Data Management

All Quran data (114 chapters, 6,236 verses, Arabic text, English translations, transliterations) is stored statically in `client/src/lib/quranData.ts`, sourced originally from Al-Quran Cloud API. Client-side persistence in local storage manages user preferences (theme, reciter, settings), bookmarks, and reading progress. A bookmark system allows saving and retrieving bookmarked verses.

# External Dependencies

## Third-Party UI Libraries

- **Radix UI Primitives**: Accessible UI components.
- **shadcn/ui**: Component library built on Radix UI.
- **Embla Carousel**: Carousel/slider functionality.
- **cmdk**: Command menu component.
- **lucide-react**: Icon library.

## Styling & Utilities

- **Tailwind CSS**: Utility-first CSS framework.
- **class-variance-authority**: For type-safe variant components.
- **clsx & tailwind-merge**: Conditional className composition.

## Forms & Validation

- **React Hook Form**: Form state management.
- **Zod**: Schema validation.
- **@hookform/resolvers**: Zod resolver for React Hook Form.

## Data Fetching & State

- **TanStack Query (React Query)**: Server state management.

## Database & ORM

- **Drizzle ORM**: Type-safe ORM for PostgreSQL.
- **@neondatabase/serverless**: Neon serverless Postgres driver.
- **connect-pg-simple**: PostgreSQL session store for Express.

## Fonts

- **Google Fonts**: Amiri font family for Arabic text.

## Development Tools

- **Vite**: Build tool and dev server.
- **tsx**: TypeScript execution for Node.js.
- **esbuild**: JavaScript bundler for server-side code.

## Utilities

- **nanoid**: Unique ID generation.
- **date-fns**: Date manipulation.
- **vaul**: Drawer component primitive.

## External APIs & Data Sources

- **Islamic Network CDN**: Provides Quran recitation audio via `/api/audio/{reciter}/{chapter}` proxy.
- **MP3Quran.net API**: Provides reciter-specific verse timestamps for accurate audio-to-verse synchronization.
- **Al-Quran Cloud API**: Used to pre-fetch static Quran text data (Arabic, Sahih International English translation, `en.transliteration` transliteration).