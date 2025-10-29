# Overview

This mobile-first Quran Reading application enables users to read, listen to, and study the Holy Quran with translations, transliterations, and audio recitation. It features a modern, dark-themed interface built with React, TypeScript, and shadcn/ui. Key capabilities include chapter browsing, continuous chapter audio playback with word-level synchronized highlighting (karaoke-style), and customizable display settings. The primary focus is on delivering an optimized mobile experience.

# Recent Changes

**October 29, 2025:**
- Completed premium dark aesthetic redesign for ChapterView (playback screen) to match HomePage and SurahJuz pages
- Added mobile status bar to ChapterView header with time and system icons
- Redesigned ChapterView header with glass treatment: circular glass back/menu buttons, large centered title with dark shadows
- Updated VerseCard component with multi-layer glass panels, gradient borders (from-white/10 to-transparent), and dark shadows
- Redesigned AudioPlayer with glass background (bg-slate-900/90 backdrop-blur-2xl), gradient top line, and deep shadows
- Replaced all golden yellow glows with elegant dark gray shadows throughout ChapterView for refined aesthetic
- All glass buttons now use bg-slate-800/60 with ring-1 ring-white/10 and shadow-[0_4px_16px_rgba(0,0,0,0.6)]
- Applied consistent dark gradient backgrounds (from-slate-950 via-indigo-950) with layered radial gradients across ChapterView
- Enhanced text readability with white colors and dark text shadows (textShadow: '0 2px 8px rgba(0,0,0,0.4)')
- Verse number badges now have glass treatment with rings and shadows matching overall design
- Audio player buttons feature icons with drop-shadow filters for depth

**October 23, 2025:**
- Implemented global speed persistence: playback speed now carries over across all chapters (setting 2x on Surah 1 keeps 2x for Surah 2, etc.)

**October 22, 2025:**
- Fixed word highlighting off-by-one error by converting Quran.com API's 1-based word indices to 0-based array indices
- Removed bookmark feature from ChapterView per user request - users no longer save/restore reading positions
- Migrated from verse-by-verse audio to continuous chapter playback with word-level synchronization using Quran.com timing API

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

The application uses a **continuous chapter audio architecture** powered by the `useWordTimingAudio` hook, providing seamless playback with word-level synchronized highlighting (karaoke-style) using Quran.com's timing API.

### Continuous Chapter Audio Architecture

The system loads a single audio file per chapter with word-level timing data from Quran.com, enabling precise word-by-word highlighting without gaps between verses:

**Audio Source**: Quran.com CDN via backend proxy `/api/audio-timing/{reciterId}/{chapter}`
- Single continuous MP3 file per chapter (typically 5-20MB depending on reciter)
- Word-level timing data from Quran.com API includes segments: `[wordIndex, startMs, endMs]`
- Backend proxy prevents CORS issues and normalizes API responses
- Audio URL can be nested at `audio_files[0].audio_url` or `audio_files[0].audio_file.audio_url`

**Playback Flow**:
1. Fetch timing data and continuous audio URL from backend proxy
2. Load chapter audio file and display "Loading..." state
3. When audio is ready (`canplay` event), enable play button
4. User clicks play → continuous audio plays, words/verses highlight in sync
5. `timeupdate` event tracks playback position and updates current word/verse
6. Playback continues seamlessly through all verses until chapter ends

**Word-Level Synchronization**:
- Each verse has an array of word segments with timestamps
- `findCurrentSegment()` matches current playback time to active word
- Word indices from API are 1-based, converted to 0-based for array access
- Handles empty segments gracefully (returns null wordIndex)
- Verse-level highlighting always works; word highlighting may have minor edge cases with special punctuation

**Progress Tracking**:
- Real-time progress bar showing current time and total chapter duration
- Seekable progress bar allows jumping to any position in the chapter
- Current verse and word tracked based on playback position
- Auto-scroll keeps current verse visible (60px offset for sticky header)

**State Management** (`useWordTimingAudio` hook):
- Uses `useRef` for audio element and timing data to prevent dependency issues
- `useCallback` for stable function references to prevent infinite loops
- Single `HTMLAudioElement` instance for entire chapter
- Handles both direct and nested audio URL structures from API

**Key Functions**:
- `togglePlayPause()`: Play/pause chapter audio
- `seek(time)`: Seek to specific time within chapter
- `seekToVerse(verseKey)`: Jump to specific verse (e.g., "1:5")
- `setSpeed(speed)`: Change playback speed (0.5x to 2.0x)
- `getTimingData()`: Access verse timings and word segments

**Global Speed Persistence**:
- Playback speed carries over across all chapters globally
- Speed preference is stored in localStorage under key `quran-playback-speed` as a single numeric value
- When user changes speed via AudioPlayer controls, the new speed is saved globally
- When navigating to any chapter, the hook loads the saved global speed (or falls back to Settings default if none exists)
- Example: Setting speed to 2x on Chapter 1 maintains 2x when navigating to Chapter 2, Chapter 3, etc.
- The speed persists across sessions until manually changed again
- One-time migration automatically cleans up old per-chapter speed data from localStorage

### Reciter System

The application supports **10 professional reciters** from EveryAyah.com with complete Quran coverage:

**Featured Reciters:**
1. **Mishary Rashid Alafasy** - Alafasy_128kbps - Default
2. **Abdul Basit Abdul Samad** - Abdul_Basit_Murattal_192kbps  
3. **Mohamed Siddiq El-Minshawi** - Minshawy_Murattal_128kbps
4. **Saud Al-Shuraim** - Saud_al-Shuraim_128kbps
5. **Abdul Bari Mohammed** - Abdul_Bari_Mohammed_64kbps
6. **Yasser Al-Dosari** - Yasser_Ad-Dussary_128kbps
7. **Ibrahim Al-Dosari** - Ibrahim_Akhdar_32kbps
8. **Nasser Al-Qatami** - Nasser_Alqatami_128kbps

Reciter metadata is defined in `client/src/lib/reciters.ts` with:
- Display names and Arabic names
- EveryAyah folder names (e.g., "Alafasy_128kbps")
- Recitation styles (Murattal, Mujawwad)
- Quality levels (64kbps to 192kbps)

Selected reciter persists in localStorage. Users can select reciters from:
1. **ChapterView menu**: Three-dot menu → Reciter submenu with checkmarks
2. **Settings page**: Audio section → Reciter dropdown

**Reciter ID Mapping**: Internal reciter IDs are mapped to Quran.com reciter IDs for timing API:
- `alafasy` → 7 (Mishary Rashid Alafasy)
- `abdul_basit` → 1 (Abdul Basit Murattal)
- `hudhaify` → 3 (Ali Al-Hudhaify)
- `hani_rifai` → 9 (Hani Rifai)
- And more in `ChapterView.tsx`

### Word & Verse Highlighting System

Word and verse highlighting is automatically synchronized with continuous audio playback using timing data from Quran.com:

**Verse Visual Indicators**:
- Blue left border (4px solid #4d7cfe) on currently playing verse
- Light blue background (rgba(77, 124, 254, 0.1))
- Primary text color for verse number and Arabic text

**Word Visual Indicators**:
- Individual Arabic words rendered as separate `<span>` elements
- Currently playing word: bold text with light blue background and padding
- Word indices converted from API's 1-based to 0-based for array access
- Bounds checking prevents highlighting of out-of-range indices

**Accessibility Attributes** (`VerseCard.tsx`):
- `data-playing="true"` on currently playing verse
- `aria-current="true"` for screen readers
- `role="article"` for semantic structure
- `data-testid="card-verse-{number}"` for testing
- Each word has unique `id="word-{chapter}-{verse}-{index}"` for targeting

**Auto-Scroll**: When enabled, automatically scrolls to bring playing verse to top of viewport (below 60px header)

**Known Limitations**: Word highlighting uses simple space-splitting which may occasionally misalign with Quran.com's canonical tokenization in verses with special Arabic punctuation or pause marks. Verse-level highlighting always works correctly.

## Data Management

All Quran data (114 chapters, 6,236 verses, Arabic text, English translations, transliterations) is stored statically in `client/src/lib/quranData.ts`, sourced originally from Al-Quran Cloud API. Client-side persistence in local storage manages user preferences (theme, reciter, speed, auto-scroll, repeat, autoplay settings). Word-level timing data is fetched dynamically from Quran.com API per chapter as needed.

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

- **Quran.com Audio API**: Provides continuous chapter audio files with word-level timing data via `/api/audio-timing/{reciterId}/{chapter}` backend proxy. Each chapter is a single MP3 file with precise word timestamps for synchronized highlighting.
- **Al-Quran Cloud API**: Used to pre-fetch static Quran text data (Arabic, Sahih International English translation, `en.transliteration` transliteration).