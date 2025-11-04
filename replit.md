# Overview

This mobile-first Quran Reading application allows users to read, listen to, and study the Holy Quran with translations, transliterations, and audio recitation. It features a modern interface built with React, TypeScript, and shadcn/ui, offering both light and dark theme variants with a premium glassmorphism aesthetic. The application focuses on delivering an optimized mobile experience with capabilities such as chapter browsing, continuous chapter audio playback with word-level synchronized highlighting (karaoke-style), and customizable display settings. The business vision is to provide a premium, aesthetically pleasing, and highly functional digital Quran experience.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend uses React 18 with TypeScript and Vite, following a component-based architecture. The UI is built with shadcn/ui (New York variant) and styled using Tailwind CSS, emphasizing a mobile-first design with a premium glassmorphism aesthetic that adapts to both light and dark themes. State management utilizes React Hooks for local state and React Query for server state. Client-side navigation uses a page state system with HomePage, SurahJuz, and Settings screens. The application features a consistent premium glassmorphism design system across all UI elements, including pages, components, modals, dropdowns, and sheets, with elegant shadows and gradient backgrounds that automatically adapt to the selected theme. All page headers (Surahs, Settings) use consistent large, bold typography (text-5xl font-black) with non-sticky layouts and circular action buttons for optimal visual harmony.

### Mobile-First Responsive Design (Updated October 30, 2025)

All UI components use viewport-relative units for mobile responsiveness:
- **Dropdowns**: Select dropdowns use `max-h-[60vh]` to ensure proper scrolling on all mobile screen sizes
- **Modals**: Constrained to viewport height with proper scrolling
- **Spacing**: Percentage-based and viewport-relative units rather than fixed pixels
- **Touch targets**: Minimum 48px for accessibility on touch devices

### Theme System (Updated October 29, 2025)

The application implements a comprehensive light and dark theme system using CSS variables in `client/src/index.css`:
- **Light Mode**: Soft backgrounds (slate-50), dark text (slate-950), subtle shadows and borders
- **Dark Mode**: Deep backgrounds (slate-950), light text, stronger shadows with indigo/amber accents
- **Theme Toggle**: Available in Settings page, persists in localStorage via App.tsx
- **Components**: All pages and UI components use semantic theme tokens (bg-background, bg-card, text-foreground, text-muted-foreground, border) for automatic theme adaptation
- **Glassmorphism**: Multi-layer glass effects adapt to each theme while maintaining premium aesthetic
- **Visual Consistency**: Background gradients, card styling, text colors, borders, and shadows all respond seamlessly to theme changes

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

# Mobile App Deployment (Updated November 4, 2025)

## Capacitor Integration

The application is configured with Capacitor to enable native iOS and Android app deployment to the App Store and Google Play Store. Capacitor wraps the existing React web application in a native container while preserving all functionality and UI.

### Configuration

- **App ID**: `com.simplequran.app`
- **App Name**: Simple Quran
- **Web Directory**: `dist/public` (Vite build output)
- **Platforms**: iOS and Android

### Project Structure

```
ios/                 # iOS (Xcode) native project
android/             # Android (Android Studio) native project
resources/           # Source files for app icons and splash screens
capacitor.config.ts  # Capacitor configuration
```

### Development Workflow

1. **Build the web app**: Run `vite build` to create production bundle in `dist/public`
2. **Sync to native platforms**: Run `npx cap sync` to copy web assets and sync plugins
3. **Open in IDE**: 
   - iOS: `npx cap open ios` (requires macOS and Xcode)
   - Android: `npx cap open android` (requires Android Studio)
4. **Test on devices**: Use Xcode/Android Studio to build and run on simulators or physical devices
5. **Build for release**: Create signed builds through Xcode/Android Studio for app store submission

### App Icons and Splash Screens

App branding assets are managed in the `resources/` directory. See `resources/README.md` for detailed setup instructions. The recommended approach is to:

1. Place a 1024x1024px app icon as `resources/icon.png`
2. Place a 2732x2732px splash screen as `resources/splash.png`
3. Run `npx capacitor-assets generate` to create all required sizes

### Publishing Requirements

- **Apple App Store**: Requires Apple Developer account ($99/year) and macOS with Xcode
- **Google Play Store**: Requires Google Play Developer account ($25 one-time fee) and Android Studio

### Backend Considerations

When deploying as a native app, ensure the backend API is accessible:
- During development: The web app makes requests to the local Express server
- In production: Update API endpoints to point to your deployed backend (consider using Replit Deployments or other hosting)