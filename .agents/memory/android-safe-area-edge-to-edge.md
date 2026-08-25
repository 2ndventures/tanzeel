---
name: Android safe-area / edge-to-edge setup
description: How this Capacitor app handles safe areas on Android vs iOS; don't break the pairing.
---
Safe areas are owned by CSS `env(safe-area-inset-*)` on BOTH platforms. The native side is configured to go edge-to-edge and stay out of the way:
- iOS: `contentInset: 'never'` (never 'always' — it double-applies the bottom inset and lifts the fixed bottom nav).
- Android: `EdgeToEdge.enable(this)` in MainActivity + `@capacitor-community/safe-area@7` (polyfill: pads the WebView on Chromium <140 where env() is 0, otherwise lets env() work natively). Requires `plugins.SystemBars.insetsHandling: 'disable'` in capacitor.config.ts — the plugin logs unpredictable behavior without it.

**Why:** Android WebView reports env() insets as 0 under enforced edge-to-edge (targetSdk 35) unless polyfilled; iOS double-counts if the WebView also reserves insets.

**How to apply:** Never add `adjustMarginsForEdgeToEdge`, `resizeOnFullScreen`, `@capacitor/status-bar`, or other safe-area plugins — they conflict. Capacitor is pinned to v7; safe-area@8 requires core >=8. After any capacitor.config.ts change run `npx cap sync`. Native changes only appear in device builds, not the web preview.
