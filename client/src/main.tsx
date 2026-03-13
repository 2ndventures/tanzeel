import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.addEventListener('focusout', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 50);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
