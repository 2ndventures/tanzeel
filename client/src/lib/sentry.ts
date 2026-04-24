import { Capacitor } from "@capacitor/core";
import * as SentryReact from "@sentry/react";

let initialised = false;

export async function initSentry(): Promise<void> {
  if (initialised) return;
  initialised = true;

  const isNative = Capacitor.isNativePlatform();
  const dsn = isNative
    ? (import.meta.env.VITE_SENTRY_DSN_IOS as string | undefined)
    : (import.meta.env.VITE_SENTRY_DSN_WEB as string | undefined);

  if (!dsn) {
    console.warn(`[Sentry] DSN not configured for platform: ${isNative ? "iOS" : "web"}`);
    return;
  }

  const environment = import.meta.env.PROD ? "production" : "development";

  // Expose the SDK on window for in-browser debugging and ad-hoc captures.
  // Safe even in production: it only gives access to the SDK, not to secrets.
  (window as any).Sentry = SentryReact;

  try {
    if (isNative) {
      // @sentry/capacitor wraps @sentry/react and is only loaded on native
      // builds, so it never costs the web bundle anything.
      const SentryCapacitor = await import("@sentry/capacitor");
      SentryCapacitor.init(
        {
          dsn,
          environment,
          tracesSampleRate: 0.1,
          attachStacktrace: true,
          enableAutoSessionTracking: true,
        },
        SentryReact.init,
      );
    } else {
      // Web: @sentry/react is statically imported above so it is registered
      // before React renders — this maximises the chance that early
      // first-paint errors are captured without blocking the bundle entry.
      SentryReact.init({
        dsn,
        environment,
        tracesSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        replaysSessionSampleRate: 0.0,
        attachStacktrace: true,
        sendDefaultPii: false,
        integrations: [
          SentryReact.browserTracingIntegration(),
          // Conservative privacy defaults: mask all DOM text and block media
          // in replays, since the app shows user bookmarks and search input.
          SentryReact.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
      });
      console.info(`[Sentry] web SDK initialised (env=${environment})`);
    }
  } catch (err) {
    console.warn("[Sentry] init failed:", err);
  }
}
