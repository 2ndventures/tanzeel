import { useEffect, useState } from "react";

/**
 * Tracks the on-screen keyboard height in px (0 when hidden).
 *
 * On native iOS the app uses Keyboard.resize = 'none', so the WebView never
 * shrinks and the only reliable signal is the native keyboardWillShow event.
 * On Android (adjustResize) and on the web, the viewport itself shrinks, so
 * the visualViewport fallback reports ~0 and no extra offset is applied —
 * which is correct there.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios") {
          const { Keyboard } = await import("@capacitor/keyboard");
          const show = await Keyboard.addListener("keyboardWillShow", (info) => {
            setKeyboardHeight(info.keyboardHeight);
          });
          const hide = await Keyboard.addListener("keyboardWillHide", () => {
            setKeyboardHeight(0);
          });
          if (cancelled) {
            show.remove();
            hide.remove();
            return;
          }
          cleanup = () => {
            show.remove();
            hide.remove();
          };
          return;
        }
      } catch {
        // fall through to visualViewport
      }

      const vv = window.visualViewport;
      if (!vv) return;
      const handleResize = () => {
        const diff = window.innerHeight - vv.height;
        setKeyboardHeight(diff > 150 ? diff : 0);
      };
      vv.addEventListener("resize", handleResize);
      if (cancelled) {
        vv.removeEventListener("resize", handleResize);
        return;
      }
      cleanup = () => vv.removeEventListener("resize", handleResize);
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return keyboardHeight;
}
