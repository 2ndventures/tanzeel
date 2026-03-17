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

  const vv = window.visualViewport;
  if (vv) {
    let activeInput: Element | null = null;

    document.addEventListener('focusin', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        activeInput = e.target;
      }
    });

    vv.addEventListener('scroll', () => {
      if (vv.offsetTop > 0) {
        document.body.style.transform = `translateY(${-vv.offsetTop}px)`;
      } else {
        document.body.style.transform = '';
      }
    });

    vv.addEventListener('resize', () => {
      const heightDiff = window.innerHeight - vv.height;
      const keyboardOpen = heightDiff > 100;
      if (!keyboardOpen && activeInput) {
        activeInput = null;
        document.body.style.transform = '';
        resetViewportScroll();
        setTimeout(resetViewportScroll, 50);
        setTimeout(resetViewportScroll, 150);
        requestAnimationFrame(resetViewportScroll);
      }
    });
  }

  document.addEventListener('focusout', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      document.body.style.transform = '';
      resetViewportScroll();
      setTimeout(resetViewportScroll, 50);
      setTimeout(resetViewportScroll, 150);
      setTimeout(resetViewportScroll, 300);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
