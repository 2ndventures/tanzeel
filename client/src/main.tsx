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

  import('@capacitor/core').then(({ Capacitor }) => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/keyboard').then(({ Keyboard }) => {
        Keyboard.addListener('keyboardDidHide', () => {
          resetViewportScroll();
          setTimeout(resetViewportScroll, 50);
          setTimeout(resetViewportScroll, 150);
          requestAnimationFrame(resetViewportScroll);
        });
      }).catch(() => {});
    }
  }).catch(() => {});

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
