# Overview

This mobile-first Quran Reading application enables users to read, listen to, and study the Holy Quran with translations, transliterations, and audio recitation. It features a modern, dark-themed interface built with React, TypeScript, and shadcn/ui. Key capabilities include chapter browsing, verse-by-verse reading with synchronized audio (karaoke-style highlighting), customizable display settings, and bookmarking. The primary focus is on delivering an optimized mobile experience.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend uses React 18 with TypeScript and Vite, following a component-based architecture. UI is built with shadcn/ui (New York variant) and styled using Tailwind CSS, emphasizing a dark-themed, mobile-first design. State management is handled with React Hooks for local state and React Query for server state. Client-side navigation uses a simple page state system. Key patterns include Compound Components, Custom Hooks (e.g., `useAudioPlayer`, `useIsMobile`), and Controlled Components.

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
Currently, only **Mishary Rashid Alafasy** (ar.alafasy) is available due to Islamic Network CDN limitations - it's the only reciter with complete surah-level audio files at 128kbps quality. The backend automatically falls back to Alafasy if other reciters are requested but unavailable.

Reciter metadata is defined in `client/src/lib/reciters.ts` with display names, Arabic names, and Islamic Network API identifiers. Selected reciter persists in localStorage with backward compatibility for legacy names.

Audio sources are from the Islamic Network CDN at `https://cdn.islamic.network/quran/audio-surah/128/{reciter}/{chapter}.mp3`, proxied through the backend to prevent CORS issues. The system handles "A'udhu billahi" as audio-only preamble, not displayed as a verse. Verse timestamp synchronization is meticulously managed for accurate highlighting across all chapters, including special handling for Chapter 9 and preambles.

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
- **Al-Quran Cloud API**: Used to pre-fetch static Quran text data (Arabic, Sahih International English translation, `en.transliteration` transliteration).