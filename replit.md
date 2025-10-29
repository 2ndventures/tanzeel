# Overview

This mobile-first Quran Reading application allows users to read, listen to, and study the Holy Quran with translations, transliterations, and audio recitation. It features a modern, dark-themed interface built with React, TypeScript, and shadcn/ui. The application focuses on delivering an optimized mobile experience with capabilities such as chapter browsing, continuous chapter audio playback with word-level synchronized highlighting (karaoke-style), and customizable display settings. The business vision is to provide a premium, aesthetically pleasing, and highly functional digital Quran experience.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend uses React 18 with TypeScript and Vite, following a component-based architecture. The UI is built with shadcn/ui (New York variant) and styled using Tailwind CSS, emphasizing a dark-themed, mobile-first design with a premium dark glassmorphism aesthetic. State management utilizes React Hooks for local state and React Query for server state. Client-side navigation uses a page state system with HomePage, SurahJuz, and Settings screens. The application features a consistent premium dark glassmorphism design system across all UI elements, including pages, components, modals, dropdowns, and sheets, with elegant dark gray shadows and dark gradient backgrounds. All page headers (Surahs, Settings) use consistent large, bold typography (text-5xl font-black) with non-sticky layouts and circular action buttons for optimal visual harmony.

## Backend Architecture

The backend is an Express.js server running on Node.js with TypeScript. It provides a RESTful API, serves the production frontend, and handles audio proxying to resolve CORS issues for the audio CDN. Data storage is currently in-memory via an `IStorage` interface, designed for future migration to a database.

## Database Architecture

The application is configured with Drizzle ORM for PostgreSQL (via `@neondatabase/serverless`). The schema is defined in `shared/schema.ts`, including a `users` table with Zod validation. Drizzle Kit handles migrations. While set up for Neon (serverless PostgreSQL), it currently uses in-memory storage.

## Audio Playback System

The application employs a continuous chapter audio architecture with word-level synchronized highlighting using `useWordTimingAudio` hook. It loads a single audio file per chapter with timing data from Quran.com, enabling seamless playback without gaps between verses. Playback speed is globally persistent, stored in `localStorage`, and applies across all chapters. The system supports 10 professional reciters from EveryAyah.com, with metadata defined in `client/src/lib/reciters.ts`. Word and verse highlighting are automatically synchronized with audio playback, featuring visual indicators and auto-scrolling to the current verse.

## Data Management

All Quran data (chapters, verses, Arabic text, English translations, transliterations) is statically stored in `client/src/lib/quranData.ts`. User preferences (theme, reciter, speed, auto-scroll, repeat, autoplay) are managed client-side using local storage. Word-level timing data is fetched dynamically from the Quran.com API as needed.

# External Dependencies

- **Third-Party UI Libraries**: Radix UI Primitives, shadcn/ui, Embla Carousel, cmdk, lucide-react.
- **Styling & Utilities**: Tailwind CSS, class-variance-authority, clsx, tailwind-merge.
- **Forms & Validation**: React Hook Form, Zod, @hookform/resolvers.
- **Data Fetching & State**: TanStack Query (React Query).
- **Database & ORM**: Drizzle ORM, @neondatabase/serverless, connect-pg-simple.
- **Fonts**: Google Fonts (Amiri).
- **External APIs & Data Sources**:
    - **Quran.com Audio API**: Provides continuous chapter audio files with word-level timing data via a backend proxy.
    - **Al-Quran Cloud API**: Used for pre-fetching static Quran text data (Arabic, Sahih International English translation, transliteration).