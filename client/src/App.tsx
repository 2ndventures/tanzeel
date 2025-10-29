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
  
  // Initialize all settings from localStorage with defaults
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });
  
  const [transliteration, setTransliteration] = useState(() => {
    const saved = localStorage.getItem('transliteration');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [showTranslation, setShowTranslation] = useState(() => {
    const saved = localStorage.getItem('showTranslation');
    return saved ? JSON.parse(saved) : true;
  });
  
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
  
  const [speed, setSpeed] = useState(() => {
    const saved = localStorage.getItem('speed');
    return saved || "Normal";
  });
  
  const [autoScroll, setAutoScroll] = useState(() => {
    const saved = localStorage.getItem('autoScroll');
    return saved ? JSON.parse(saved) : true;
  });
  
  const [repeat, setRepeat] = useState(() => {
    const saved = localStorage.getItem('repeat');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [autoplay, setAutoplay] = useState(() => {
    const saved = localStorage.getItem('autoplay');
    return saved ? JSON.parse(saved) : true;
  });
  
  const [translation, setTranslation] = useState("English");

  // Text display settings
  const [arabicFontSize, setArabicFontSize] = useState(() => {
    const saved = localStorage.getItem('arabicFontSize');
    return saved || "Large";
  });

  const [translationFontSize, setTranslationFontSize] = useState(() => {
    const saved = localStorage.getItem('translationFontSize');
    return saved || "Medium";
  });

  const [transliterationFontSize, setTransliterationFontSize] = useState(() => {
    const saved = localStorage.getItem('transliterationFontSize');
    return saved || "Small";
  });

  const [lineSpacing, setLineSpacing] = useState(() => {
    const saved = localStorage.getItem('lineSpacing');
    return saved || "Normal";
  });

  const [showVerseNumbers, setShowVerseNumbers] = useState(() => {
    const saved = localStorage.getItem('showVerseNumbers');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('transliteration', JSON.stringify(transliteration));
  }, [transliteration]);

  useEffect(() => {
    localStorage.setItem('showTranslation', JSON.stringify(showTranslation));
  }, [showTranslation]);

  useEffect(() => {
    localStorage.setItem('speed', speed);
  }, [speed]);

  useEffect(() => {
    localStorage.setItem('autoScroll', JSON.stringify(autoScroll));
  }, [autoScroll]);

  useEffect(() => {
    localStorage.setItem('repeat', JSON.stringify(repeat));
  }, [repeat]);

  useEffect(() => {
    localStorage.setItem('autoplay', JSON.stringify(autoplay));
  }, [autoplay]);

  useEffect(() => {
    localStorage.setItem('reciter', reciter);
  }, [reciter]);

  useEffect(() => {
    localStorage.setItem('arabicFontSize', arabicFontSize);
  }, [arabicFontSize]);

  useEffect(() => {
    localStorage.setItem('translationFontSize', translationFontSize);
  }, [translationFontSize]);

  useEffect(() => {
    localStorage.setItem('transliterationFontSize', transliterationFontSize);
  }, [transliterationFontSize]);

  useEffect(() => {
    localStorage.setItem('lineSpacing', lineSpacing);
  }, [lineSpacing]);

  useEffect(() => {
    localStorage.setItem('showVerseNumbers', JSON.stringify(showVerseNumbers));
  }, [showVerseNumbers]);

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
        <div className="min-h-screen transition-smooth">
          <div key={currentPage} className="animate-fade-in">
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
                arabicFontSize={arabicFontSize}
                translationFontSize={translationFontSize}
                transliterationFontSize={transliterationFontSize}
                lineSpacing={lineSpacing}
                showVerseNumbers={showVerseNumbers}
                onArabicFontSizeChange={setArabicFontSize}
                onTranslationFontSizeChange={setTranslationFontSize}
                onTransliterationFontSizeChange={setTransliterationFontSize}
                onLineSpacingChange={setLineSpacing}
                onShowVerseNumbersChange={setShowVerseNumbers}
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
                autoScroll={autoScroll}
                onAutoScrollChange={setAutoScroll}
                repeat={repeat}
                onRepeatChange={setRepeat}
                autoplay={autoplay}
                onAutoplayChange={setAutoplay}
                translation={translation}
                onTranslationChange={setTranslation}
                arabicFontSize={arabicFontSize}
                onArabicFontSizeChange={setArabicFontSize}
                translationFontSize={translationFontSize}
                onTranslationFontSizeChange={setTranslationFontSize}
                transliterationFontSize={transliterationFontSize}
                onTransliterationFontSizeChange={setTransliterationFontSize}
                lineSpacing={lineSpacing}
                onLineSpacingChange={setLineSpacing}
                showVerseNumbers={showVerseNumbers}
                onShowVerseNumbersChange={setShowVerseNumbers}
              />
            )}
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
