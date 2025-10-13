import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import ChapterView from "@/pages/ChapterView";
import Settings from "@/pages/Settings";

type Page = "home" | "chapter" | "settings";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [darkMode, setDarkMode] = useState(true);
  const [transliteration, setTransliteration] = useState(false);
  const [font, setFont] = useState("System");
  const [reciter, setReciter] = useState("Alafasy");
  const [speed, setSpeed] = useState("Normal");
  const [autoScroll, setAutoScroll] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [translation, setTranslation] = useState("English");

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleNavigate = (page: string, chapterId?: number) => {
    setCurrentPage(page as Page);
    if (chapterId) setSelectedChapter(chapterId);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen">
          {currentPage === "home" && (
            <Home onNavigate={handleNavigate} />
          )}
          {currentPage === "chapter" && (
            <ChapterView
              chapterId={selectedChapter}
              onBack={() => setCurrentPage("home")}
              showTransliteration={transliteration}
            />
          )}
          {currentPage === "settings" && (
            <Settings
              onBack={() => setCurrentPage("home")}
              darkMode={darkMode}
              onDarkModeChange={setDarkMode}
              transliteration={transliteration}
              onTransliterationChange={setTransliteration}
              font={font}
              onFontChange={setFont}
              reciter={reciter}
              onReciterChange={setReciter}
              speed={speed}
              onSpeedChange={setSpeed}
              autoScroll={autoScroll}
              onAutoScrollChange={setAutoScroll}
              repeat={repeat}
              onRepeatChange={setRepeat}
              translation={translation}
              onTranslationChange={setTranslation}
            />
          )}
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
