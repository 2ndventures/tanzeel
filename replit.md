# Overview

Tanzeel is a mobile-first Quran Reading application that provides users with an immersive experience to read, listen to, and study the Holy Quran. It features translations, transliterations, and audio recitation with word-level synchronized highlighting. Built with React, TypeScript, and shadcn/ui, it offers a modern, premium glassmorphism interface with adaptable light and dark themes, optimized for mobile. The application aims to deliver a highly functional and aesthetically pleasing digital Quran experience, enabling features like continuous chapter audio playback, customizable display settings, and robust bookmarking.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend uses React 18 with TypeScript and Vite, adopting a component-based architecture. UI is built with shadcn/ui (New York variant) and Tailwind CSS, focusing on a mobile-first design with a premium glassmorphism aesthetic that supports both light and dark themes. State management relies on React Hooks and React Query. Navigation is handled client-side across HomePage, SurahJuz, Bookmarks, and Settings screens. The design system ensures consistent premium glassmorphism across all UI elements, adapting seamlessly to themes with elegant shadows and gradient backgrounds. Headers use large, bold typography and circular action buttons.

### Mobile-First Responsive Design

All UI components utilize viewport-relative units for responsiveness, ensuring proper display and scrolling on various mobile screen sizes. This includes dropdowns, modals, spacing, and minimum 48px touch targets for accessibility.

### Status Bar System

The application incorporates safe-area handling for native mobile deployment. It features a `StatusBarShim` component, fixed headers for Home and Settings pages, and collapsible headers for reading screens (SurahJuz, ChapterView) that hide on scroll down and reappear on scroll up. Dynamic padding with `calc()` expressions correctly accounts for `safe-area-inset-top` on devices with notches or dynamic islands, ensuring smooth transitions.

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

The system provides continuous chapter audio playback with word-level synchronized highlighting using a `useWordTimingAudio` hook. It loads single audio files per chapter with timing data from Quran.com, supporting seamless playback. Global playback speed is persistent via `localStorage`. The system supports 10 professional reciters from EveryAyah.com, with dynamic word and verse highlighting and auto-scrolling. The backend normalizes inconsistent Quran.com API responses for audio timing.

## Bookmarking System

A customizable verse bookmarking system is implemented, stored in `localStorage`. It allows users to add/remove bookmarks, organize them into custom folders, add notes, and navigate directly to bookmarked verses. The system includes duplicate prevention for folder names and is integrated into `VerseCard` and a dedicated `Bookmarks` page.

## Search System

The SurahJuz page features a 2-layer local search system triggered when users type 3+ characters:
1. **Surah Name Filtering**: Instant client-side filtering of chapter names (and meanings) with transliteration normalization
2. **Topic Index Matching**: Client-side keyword matching against 50+ curated Quranic themes (`client/src/lib/topicIndex.ts`)

All search is performed locally with no server calls. When searching, the page title and tab switcher collapse to maximize screen space for results. Topic results show verse references with translation previews loaded on demand.

## Data Management

Quran data (chapters, verses, Arabic text, English translations, transliterations) is statically stored client-side. User preferences (theme, reciter, speed, auto-scroll, repeat, autoplay) are managed using local storage. Word-level timing data is fetched dynamically from the Quran.com API.

# External Dependencies

- **Third-Party UI Libraries**: Radix UI Primitives, shadcn/ui, Embla Carousel, cmdk, lucide-react.
- **Styling & Utilities**: Tailwind CSS, class-variance-authority, clsx, tailwind-merge.
- **Forms & Validation**: React Hook Form, Zod, @hookform/resolvers.
- **Data Fetching & State**: TanStack Query (React Query).
- **Database & ORM**: Drizzle ORM, @neondatabase/serverless, connect-pg-simple.
- **Fonts**: Google Fonts (Amiri).
- **External APIs & Data Sources**:
    - **Quran.com Audio API**: Provides continuous chapter audio files and word-level timing data via a backend proxy.
    - **Al-Quran Cloud API**: Used for pre-fetching static Quran text data (Arabic, Sahih International English translation, transliteration).
- **Mobile Deployment**: Capacitor for native iOS and Android app deployment.