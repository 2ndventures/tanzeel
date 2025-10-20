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

A custom `useAudioPlayer` hook manages audio state, playback controls, and verse progression. The system uses a **verse-by-verse architecture** where each verse is loaded and played individually, eliminating synchronization issues entirely.

### Verse-by-Verse Audio Architecture

The application uses **individual MP3 files per verse** from EveryAyah.com, providing perfect synchronization between audio and text:

**Audio Source**: EveryAyah.com CDN via backend proxy `/api/verse-audio/{reciter}/{surah}/{ayah}`
- Each verse is a separate MP3 file (typically 100-300KB)
- Individual files load quickly (~1-2 seconds)
- No timestamp synchronization needed - audio and text are naturally synchronized
- Backend proxy prevents CORS issues and adds caching headers

**Playback Flow**:
1. Load first verse MP3 and display "Loading..." state
2. When audio is ready (`canplay` event), enable play button
3. User clicks play → verse 1 audio plays, verse 1 card highlights
4. When verse 1 ends (`ended` event) → automatically load and play verse 2
5. Repeat until all verses in chapter are complete

**State Management** (`useAudioPlayer` hook):
- Uses `useRef` for speed to prevent dependency array issues
- `useCallback` for stable function references to prevent infinite loops
- Fresh `HTMLAudioElement` created for each verse
- Cleanup avoids setting `src = ''` to prevent "Empty src" errors

**Key Functions**:
- `loadVerse(verseNum, autoPlay)`: Loads specific verse, optionally starts playback
- `togglePlayPause()`: Play/pause current verse
- `nextVerse()`: Skip to next verse
- `prevVerse()`: Go to previous verse
- `seekToVerse(verseNum)`: Jump to specific verse

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

**Audio URL Format**: `https://www.everyayah.com/data/{reciter_folder}/{surah_padded}{ayah_padded}.mp3`
- Example: `https://www.everyayah.com/data/Alafasy_128kbps/001001.mp3` (Surah 1, Verse 1)
- Proxied through backend to prevent CORS: `/api/verse-audio/Alafasy_128kbps/001/001`

### Verse Highlighting System

Verse highlighting is automatically synchronized with audio playback since each verse is a separate audio file:

**Visual Indicators**:
- Blue left border (4px solid #4d7cfe)
- Light blue background (rgba(77, 124, 254, 0.1))
- Primary text color for verse number and Arabic text

**Accessibility Attributes** (`VerseCard.tsx`):
- `data-playing="true"` on currently playing verse
- `aria-current="true"` for screen readers
- `role="article"` for semantic structure
- `data-testid="card-verse-{number}"` for testing

**Auto-Scroll**: When enabled, automatically scrolls to bring playing verse to top of viewport (below 60px header)

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

- **EveryAyah.com CDN**: Provides individual verse-by-verse Quran recitation audio via `/api/verse-audio/{reciter}/{surah}/{ayah}` backend proxy. Each verse is a separate MP3 file for perfect synchronization.
- **Al-Quran Cloud API**: Used to pre-fetch static Quran text data (Arabic, Sahih International English translation, `en.transliteration` transliteration).