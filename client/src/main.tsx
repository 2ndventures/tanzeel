import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (isIOS) {
  const resetViewportScroll = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  let usingNativeKeyboard = false;

  import('@capacitor/core').then(({ Capacitor }) => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/keyboard').then(({ Keyboard }) => {
        usingNativeKeyboard = true;
        Keyboard.addListener('keyboardDidHide', () => {
          resetViewportScroll();
          setTimeout(resetViewportScroll, 50);
          setTimeout(resetViewportScroll, 150);
          requestAnimationFrame(resetViewportScroll);
        });
      }).catch(() => {});
    }
  }).catch(() => {});

  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener('resize', () => {
      if (usingNativeKeyboard) return;
      const heightDiff = window.innerHeight - vv.height;
      const keyboardOpen = heightDiff > 100;
      if (!keyboardOpen) {
        resetViewportScroll();
        setTimeout(resetViewportScroll, 50);
        requestAnimationFrame(resetViewportScroll);
      }
    });
  }

  document.addEventListener('focusout', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      resetViewportScroll();
      setTimeout(resetViewportScroll, 50);
      setTimeout(resetViewportScroll, 150);
      setTimeout(resetViewportScroll, 300);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
