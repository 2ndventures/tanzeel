import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  const resetScroll = () => {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  };

  document.addEventListener('focusout', resetScroll);

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resetScroll);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
