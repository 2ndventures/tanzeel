import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "@/pages/HomePage";
import SurahJuz from "@/pages/SurahJuz";
import ChapterView from "@/pages/ChapterView";
import Settings from "@/pages/Settings";
import { DEFAULT_RECITER, getLegacyReciterId, isValidReciterId, LEGACY_RECITER_MAP } from "@/lib/reciters";

type Page = "home" | "surah-juz" | "chapter" | "settings";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"home" | "surah" | "settings">("home");
  const [darkMode, setDarkMode] = useState(true);
  const [transliteration, setTransliteration] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [font, setFont] = useState("System");
  const [reciter, setReciter] = useState(() => {
    const saved = localStorage.getItem('reciter');
    if (saved) {
      const trimmedId = saved.trim();
      
      // Check if this is a legacy ID that needs migration
      const migratedId = getLegacyReciterId(trimmedId);
      if (migratedId !== DEFAULT_RECITER || trimmedId in LEGACY_RECITER_MAP) {
        // Legacy ID found - migrate it
        localStorage.setItem('reciter', migratedId);
        console.log(`Migrated reciter from "${trimmedId}" to "${migratedId}"`);
        return migratedId;
      }
      
      // Validate that the reciter ID exists in our current RECITERS list
      if (isValidReciterId(trimmedId)) {
        return trimmedId;
      }
      
      // If reciter ID is invalid/removed, reset to default
      console.log(`Reciter ID "${trimmedId}" not found, resetting to default`);
      localStorage.setItem('reciter', DEFAULT_RECITER);
      return DEFAULT_RECITER;
    }
    return DEFAULT_RECITER;
  });
  const [speed, setSpeed] = useState("Normal");
  const [autoScroll, setAutoScroll] = useState(true);
  const [repeat, setRepeat] = useState(false);
  const [autoplay, setAutoplay] = useState(() => {
    const saved = localStorage.getItem('autoplay');
    return saved ? JSON.parse(saved) : false;
  });
  const [translation, setTranslation] = useState("English");

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('autoplay', JSON.stringify(autoplay));
  }, [autoplay]);

  useEffect(() => {
    localStorage.setItem('reciter', reciter);
  }, [reciter]);

  const handleNavigate = (page: string, chapterId?: number, tab?: "home" | "surah" | "settings") => {
    setCurrentPage(page as Page);
    if (tab) {
      setActiveTab(tab);
    } else if (page === "settings") {
      setActiveTab("settings");
    } else if (page === "surah-juz") {
      setActiveTab("surah");
    } else if (page === "home") {
      setActiveTab("home");
    }
    if (chapterId) setSelectedChapter(chapterId);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen">
          {currentPage === "home" && (
            <HomePage onNavigate={handleNavigate} activeTab={activeTab} />
          )}
          {currentPage === "surah-juz" && (
            <SurahJuz onNavigate={handleNavigate} activeTab={activeTab} />
          )}
          {currentPage === "chapter" && (
            <ChapterView
              chapterId={selectedChapter}
              onBack={() => {
                setCurrentPage("surah-juz");
                setActiveTab("surah");
              }}
              showTransliteration={transliteration}
              showTranslation={showTranslation}
              onNavigate={handleNavigate}
              reciter={reciter}
              speed={speed}
              autoScroll={autoScroll}
              repeat={repeat}
              autoplay={autoplay}
              darkMode={darkMode}
              onAutoScrollChange={setAutoScroll}
              onRepeatChange={setRepeat}
              onAutoplayChange={setAutoplay}
              onDarkModeChange={setDarkMode}
              onTransliterationChange={setTransliteration}
              onShowTranslationChange={setShowTranslation}
              onReciterChange={setReciter}
            />
          )}
          {currentPage === "settings" && (
            <Settings
              onBack={() => {
                setCurrentPage("home");
                setActiveTab("home");
              }}
              onNavigate={handleNavigate}
              darkMode={darkMode}
              onDarkModeChange={setDarkMode}
              transliteration={transliteration}
              onTransliterationChange={setTransliteration}
              showTranslation={showTranslation}
              onShowTranslationChange={setShowTranslation}
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
              autoplay={autoplay}
              onAutoplayChange={setAutoplay}
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
