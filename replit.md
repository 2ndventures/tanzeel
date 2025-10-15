# Overview

This is a Quran Reading application that provides users with the ability to read, listen to, and study the Holy Quran with translations, transliterations, and audio recitation. The application features a modern, dark-themed interface (#1a1f2e background, #252d3d cards, #4d7cfe accent) built with React and TypeScript, utilizing shadcn/ui components for a polished user experience.

The app includes chapter browsing, verse-by-verse reading with synchronized audio playback (karaoke-style highlighting), customizable display settings, and bookmark functionality for tracking reading progress.

**Current Status**: Fully functional with real Quran audio recitation from Islamic Network CDN, verse timing synchronization, bookmarks, and all settings operational. Backend audio proxy handles CORS and provides seamless audio streaming. Complete Quran data (all 114 chapters, 6,236 verses) with Arabic text, English translations, and transliterations.

**Recent Updates (October 15, 2025)**:
- **Verse Selection**: Click any verse card to instantly seek to and play from that verse
- **Full-Width AudioPlayer**: Redesigned from floating card to fixed full-width bar positioned directly above navigation
- **Enhanced Settings**: Reorganized settings with new Translation toggle for showing/hiding translations, Language selector moved to Display section, Content section removed

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Technology Stack**: React 18 with TypeScript, using Vite as the build tool and development server. The application follows a component-based architecture with functional components and React Hooks.

**UI Framework**: Built on shadcn/ui (New York variant) - a collection of re-usable components built with Radix UI primitives and styled with Tailwind CSS. All UI components are located in `client/src/components/ui/`.

**Styling Approach**: Tailwind CSS with custom design tokens defined through CSS variables. The app implements a comprehensive theming system supporting both light and dark modes, with the dark mode as the primary theme. Design guidelines emphasize pixel-perfect replication with specific color palettes, typography, and spacing systems.

**State Management**: Local component state using React hooks (useState, useEffect, useRef). No global state management library is currently implemented. The app uses React Query (@tanstack/react-query) for server state management and data fetching.

**Routing**: Client-side routing is handled through component state rather than a traditional router library. Navigation is managed via a simple page state system in the main App component.

**Key Design Patterns**:
- **Compound Components**: Used extensively in shadcn/ui components (Dialogs, Dropdowns, etc.)
- **Custom Hooks**: Specialized hooks for audio playback (`useAudioPlayer`), mobile detection (`useIsMobile`), and toast notifications (`useToast`)
- **Controlled Components**: Form inputs and interactive elements are controlled via React state

## Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript support via tsx. The server provides both API endpoints and serves the production-built frontend.

**API Design**: RESTful API structure with routes prefixed with `/api`. The routes are registered in `server/routes.ts` and use the storage interface for data operations.

**Data Storage**: Currently implements an in-memory storage solution (`MemStorage` class) with an interface-based design (`IStorage`) that allows for easy migration to a database backend. The storage interface defines CRUD operations for users and can be extended for Quran-specific data.

**Session Management**: Uses connect-pg-simple for session storage (based on package dependencies), though the current implementation uses memory storage.

**Development vs Production**: 
- Development mode uses Vite middleware for HMR and fast refresh
- Production mode serves pre-built static assets from the `dist/public` directory
- Separate build processes for client (Vite) and server (esbuild)

## Database Architecture

**ORM**: Drizzle ORM configured for PostgreSQL (via @neondatabase/serverless driver), though the database is not yet provisioned based on configuration requirements.

**Schema Definition**: Database schema defined in `shared/schema.ts` using Drizzle's type-safe schema builder. Currently includes a users table with UUID primary keys and Zod validation schemas.

**Migration Strategy**: Drizzle Kit handles migrations with configuration in `drizzle.config.ts`. Migrations are generated in the `/migrations` directory.

**Database Provider**: Configured to use Neon (serverless PostgreSQL) via the DATABASE_URL environment variable.

**Future Considerations**: The current in-memory storage will need to be replaced with actual database queries. The architecture supports this through the IStorage interface pattern, allowing a clean transition to DatabaseStorage implementation.

## Audio Playback System

**Custom Audio Hook**: `useAudioPlayer` hook manages audio state, playback controls, and verse synchronization using atomic state updates. It handles:
- Play/pause functionality with HTML5 Audio API
- Seeking and progress tracking with real-time updates
- Playback speed adjustment (1.0x, 1.25x, 1.5x, 1.75x, 2.0x)
- Verse-timestamp synchronization for karaoke-style highlighting
- Repeat functionality (loops chapter when enabled)
- Auto-scroll coordination (scrolls to currently playing verse)
- Prev/Next verse navigation (supports seeking to preamble/verse 0)
- Gap detection (turns off highlighting in untimed regions while preserving navigation)

**State Management**: All audio state (isPlaying, currentTime, currentVerse, isInVerseRange, error, etc.) is consolidated in a single atomic state object. This ensures:
- All state updates are synchronized in a single render cycle
- No mismatched state values during highlighting checks
- Proper error recovery when switching chapters (errors are cleared on new audio load)

**Audio Sources**: Real Quran recitation audio from Islamic Network CDN:
- Backend proxy endpoint (`/api/audio/{reciter}/{chapter}`) fetches from cdn.islamic.network
- Solves CORS issues by streaming audio through Express server
- Three reciters available: Alafasy (Mishary Rashid Alafasy), Sudais (Abdur-Rahman Al-Sudais), Ghamadi (Saad Al-Ghamadi)
- Automatic fallback to Alafasy if selected reciter's audio is unavailable

**Preamble Implementation**:
- **Visual Display**: "A'udhu billahi min ash-shaytan ir-rajim" (seeking refuge) displayed as "Preamble" (verse 0)
- **Arabic Text**: "أَعُوذُ بِٱللَّهِ مِنَ ٱلشَّيۡطَٰنِ ٱلرَّجِيمِ"
- **English Translation**: "I seek refuge in Allah from Satan, the expelled."
- **Audio Timing**: Preamble included in audio for most chapters before verse 1

**Verse Timestamp Synchronization**:
- **Chapter 1 (Al-Fatihah)**: 6-second preamble (verse 0: 0-6s), then verses 1-7 with fine-tuned timestamps (Verse 1: 6-11.5s, Verse 2: 11.5-17s, etc.)
- **Chapters 2-8, 10-114**: 3-second preamble before verse 1, displayed and highlighted during recitation
- **Chapter 9 (At-Tawbah)**: No preamble, timestamps start directly with verse 1 at 0s (uses ~8s average per verse)
- **Gap Handling**: `isInVerseRange` flag tracks whether current playback time is within a valid verse timestamp range
  - When true: highlighting is active
  - When false (gaps/untimed regions): highlighting turns off but navigation functions still work
- Console logging tracks verse/preamble changes with format: `✓ Preamble/Verse N highlighting at Xs (expected: X-Xs)`

**Audio Lifecycle Management**: 
- Audio element only recreates when audioUrl changes, not on speed/repeat/timestamp updates (prevents playback interruption)
- Error state is explicitly cleared when loading new audio to ensure proper recovery across chapter changes

## Data Management

**Quran Data**: Complete static data for all 114 chapters (6,236 total verses) stored in `client/src/lib/quranData.ts`. Fetched from Al-Quran Cloud API with Sahih International translation using the `en.transliteration` edition (NOT `en.transliteration.v2` which returns Arabic script). This includes chapter metadata (Arabic names, English names, verse counts, revelation types) and verse content (Arabic text, English transliteration in Latin characters, English translation). File size: 38,699 lines of TypeScript.

**Local Storage**: Client-side persistence for:
- User preferences (theme, transliteration, font, reciter, speed settings)
- Bookmarks (chapter and verse tracking with timestamps)
- Reading progress

**Bookmark System**: Implemented through utility functions in `client/src/lib/bookmarks.ts` allowing users to save, remove, and retrieve bookmarked verses per chapter.

# External Dependencies

## Third-Party UI Libraries

- **Radix UI Primitives**: Comprehensive collection of unstyled, accessible UI components (@radix-ui/react-*) including dialogs, dropdowns, tooltips, switches, sliders, and more
- **shadcn/ui**: Pre-built component library built on Radix UI, configured in `components.json`
- **Embla Carousel**: Carousel/slider functionality (embla-carousel-react)
- **cmdk**: Command menu component for search/navigation
- **lucide-react**: Icon library for UI elements

## Styling & Utilities

- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **class-variance-authority**: For building type-safe variant-based components
- **clsx & tailwind-merge**: Utility functions for conditional className composition

## Forms & Validation

- **React Hook Form**: Form state management (@tanstack/react-query)
- **Zod**: Schema validation (with Drizzle integration via drizzle-zod)
- **@hookform/resolvers**: Zod resolver for React Hook Form

## Data Fetching & State

- **TanStack Query (React Query)**: Server state management and data fetching (@tanstack/react-query)

## Database & ORM

- **Drizzle ORM**: Type-safe ORM for PostgreSQL (drizzle-orm, drizzle-zod)
- **@neondatabase/serverless**: Neon serverless Postgres driver
- **connect-pg-simple**: PostgreSQL session store for Express

## Fonts

- **Google Fonts**: Amiri font family for Arabic text rendering (loaded via CDN in index.html)

## Development Tools

- **Vite**: Build tool and development server with HMR
- **@replit/vite-plugin-***: Replit-specific Vite plugins for runtime error overlay, cartographer, and dev banner
- **tsx**: TypeScript execution for Node.js
- **esbuild**: JavaScript bundler for server-side code

## Utilities

- **nanoid**: Unique ID generation
- **date-fns**: Date manipulation and formatting
- **vaul**: Drawer component primitive

## External APIs & Data Sources

**Audio CDN**: Islamic Network CDN (cdn.islamic.network) provides authentic Quran recitations:
- Accessed via backend proxy at `/api/audio/{reciter}/{chapter}`
- Three reciters available with automatic fallback to Alafasy
- High-quality 128kbps MP3 format

**Quran Text Data**: Al-Quran Cloud API (api.alquran.cloud):
- Used to fetch complete Quran text, translations, and transliterations
- Sahih International English translation (edition: `en.sahih`)
- English transliteration in Latin characters (edition: `en.transliteration`)
  - **Important**: Use `en.transliteration` NOT `en.transliteration.v2` - the v2 edition returns Arabic script instead of Latin transliterations
- Data fetched once and stored statically in quranData.ts (no runtime API calls)