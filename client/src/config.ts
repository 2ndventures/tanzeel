import { Capacitor } from '@capacitor/core';

// API base URL resolution.
//
// - Web (any browser context — dev preview, published deployment, custom
//   domain): always use relative URLs. Our Express server serves both the
//   frontend bundle AND the /api/* endpoints from the same origin, so a
//   relative URL is always correct and avoids any DNS / CORS surprises.
//
// - Native (Capacitor iOS/Android): the WebView loads from a `capacitor://`
//   scheme, so relative URLs can't work — we need a real https URL. Use
//   the VITE_API_BASE_URL env var if set at build time, otherwise fall
//   back to the production custom domain. Note: the TestFlight build
//   currently in users' hands has whatever value was baked in at build
//   time; changing this fallback only affects future builds.

const getApiBaseUrl = (): string => {
  if (Capacitor.isNativePlatform()) {
    const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
    const trimmed = raw?.trim();
    if (trimmed && /^https:\/\/[^\s/]+/i.test(trimmed)) {
      return trimmed.replace(/\/+$/, '');
    }
    return 'https://www.tanzeel.ai';
  }
  return '';
};

export const API_BASE_URL = getApiBaseUrl();
