import { useState, useEffect, useRef, useCallback } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import HomePage from "@/pages/HomePage";
import SurahJuz from "@/pages/SurahJuz";
import ChapterView from "@/pages/ChapterView";
import Settings from "@/pages/Settings";
import Bookmarks from "@/pages/Bookmarks";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import OnboardingScreen from "@/components/OnboardingScreen";
import SplashScreen from "@/components/SplashScreen";
import { DEFAULT_RECITER, getLegacyReciterId, isValidReciterId, LEGACY_RECITER_MAP } from "@/lib/reciters";
import type { LayoutMode } from "@/lib/quranMetadata";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { initStorage, getItem, setItem, removeItem } from "@/lib/storage";

const CapApp = registerPlugin<{
  exitApp: () => Promise<void>;
  addListener: (eventName: string, callback: () => void) => Promise<{ remove: () => void }>;
}>('App');

type Page = "home" | "surah-juz" | "chapter" | "settings" | "bookmarks" | "privacy-policy" | "terms-of-service";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [initialVerse, setInitialVerse] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"home" | "surah" | "settings" | "bookmarks">("home");
  
  const [showSplash, setShowSplash] = useState(true);
  const [storageReady, setStorageReady] = useState(false);
  const [splashAnimDone, setSplashAnimDone] = useState(false);

  useEffect(() => {
    if (storageReady && splashAnimDone) {
      setShowSplash(false);
    }
  }, [storageReady, splashAnimDone]);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [transliteration, setTransliteration] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [arabicScript, setArabicScript] = useState<'uthmani' | 'indopak' | 'tajweed'>('uthmani');
  const [reciter, setReciter] = useState(DEFAULT_RECITER);
  const [autoScroll, setAutoScroll] = useState(true);
  const [repeat, setRepeat] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('standard');
  const [translation, setTranslation] = useState("English");
  const [arabicFontSize, setArabicFontSize] = useState("Large");
  const [translationFontSize, setTranslationFontSize] = useState("Medium");
  const [transliterationFontSize, setTransliterationFontSize] = useState("Small");
  const [lineSpacing, setLineSpacing] = useState("Normal");
  const [showVerseNumbers, setShowVerseNumbers] = useState(true);

  useEffect(() => {
    initStorage().then(() => {
      const completed = getItem('onboardingCompleted');
      setShowOnboarding(!completed);

      const savedDark = getItem('darkMode');
      if (savedDark !== null) setDarkMode(JSON.parse(savedDark));

      const savedTranslit = getItem('transliteration');
      if (savedTranslit !== null) setTransliteration(JSON.parse(savedTranslit));

      const savedTranslation = getItem('showTranslation');
      if (savedTranslation !== null) setShowTranslation(JSON.parse(savedTranslation));

      const savedScript = getItem('arabicScript');
      if (savedScript === 'indopak' || savedScript === 'tajweed') setArabicScript(savedScript);

      const savedReciter = getItem('reciter');
      if (savedReciter) {
        const trimmedId = savedReciter.trim();
        const migratedId = getLegacyReciterId(trimmedId);
        if (migratedId !== DEFAULT_RECITER || trimmedId in LEGACY_RECITER_MAP) {
          setItem('reciter', migratedId);
          setReciter(migratedId);
        } else if (isValidReciterId(trimmedId)) {
          setReciter(trimmedId);
        } else {
          setItem('reciter', DEFAULT_RECITER);
        }
      }

      const savedAutoScroll = getItem('autoScroll');
      if (savedAutoScroll !== null) setAutoScroll(JSON.parse(savedAutoScroll));

      const savedRepeat = getItem('repeat');
      if (savedRepeat !== null) setRepeat(JSON.parse(savedRepeat));

      const savedAutoplay = getItem('autoplay');
      if (savedAutoplay !== null) setAutoplay(JSON.parse(savedAutoplay));

      const savedLayout = getItem('layoutMode');
      if (savedLayout === 'focused-flow' || savedLayout === 'mushaf' || savedLayout === 'hifz') setLayoutMode(savedLayout);

      const savedArabicFont = getItem('arabicFontSize');
      if (savedArabicFont) setArabicFontSize(savedArabicFont);

      const savedTransFont = getItem('translationFontSize');
      if (savedTransFont) setTranslationFontSize(savedTransFont);

      const savedTranslitFont = getItem('transliterationFontSize');
      if (savedTranslitFont) setTransliterationFontSize(savedTranslitFont);

      const savedSpacing = getItem('lineSpacing');
      if (savedSpacing) setLineSpacing(savedSpacing);

      const savedVerseNums = getItem('showVerseNumbers');
      if (savedVerseNums !== null) setShowVerseNumbers(JSON.parse(savedVerseNums));

      setStorageReady(true);
    });
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    const themeColor = darkMode ? '#101828' : '#ffffff';
    let meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', themeColor);
    setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    if (!storageReady) return;
    setItem('transliteration', JSON.stringify(transliteration));
  }, [transliteration, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    setItem('showTranslation', JSON.stringify(showTranslation));
  }, [showTranslation, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    setItem('autoScroll', JSON.stringify(autoScroll));
  }, [autoScroll, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    setItem('repeat', JSON.stringify(repeat));
  }, [repeat, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    setItem('autoplay', JSON.stringify(autoplay));
  }, [autoplay, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    setItem('reciter', reciter);
  }, [reciter, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    setItem('arabicFontSize', arabicFontSize);
  }, [arabicFontSize, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    setItem('translationFontSize', translationFontSize);
  }, [translationFontSize, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    setItem('transliterationFontSize', transliterationFontSize);
  }, [transliterationFontSize, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    setItem('lineSpacing', lineSpacing);
  }, [lineSpacing, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    setItem('showVerseNumbers', JSON.stringify(showVerseNumbers));
  }, [showVerseNumbers, storageReady]);

  useEffect(() => {
    if (storageReady) setItem('arabicScript', arabicScript);
  }, [arabicScript, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    setItem('layoutMode', layoutMode);
  }, [layoutMode, storageReady]);

  const settingsBackHandlerRef = useRef<(() => boolean) | null>(null);

  const handleBackButton = useCallback(() => {
    switch (currentPage) {
      case "privacy-policy":
      case "terms-of-service":
        setCurrentPage("settings");
        setActiveTab("settings");
        break;
      case "chapter":
        setCurrentPage("surah-juz");
        setActiveTab("surah");
        break;
      case "settings":
        if (settingsBackHandlerRef.current && settingsBackHandlerRef.current()) {
          break;
        }
        setCurrentPage("home");
        setActiveTab("home");
        break;
      case "surah-juz":
      case "bookmarks":
        setCurrentPage("home");
        setActiveTab("home");
        break;
      case "home":
      default:
        CapApp.exitApp();
        break;
    }
  }, [currentPage]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    const listener = CapApp.addListener('backButton', handleBackButton);
    return () => {
      listener.then(l => l.remove());
    };
  }, [handleBackButton]);

  const handleNavigate = (page: string, chapterId?: number, tab?: "home" | "surah" | "settings" | "bookmarks", verseNumber?: number) => {
    setCurrentPage(page as Page);
    if (tab) {
      setActiveTab(tab);
    } else if (page === "settings") {
      setActiveTab("settings");
    } else if (page === "surah-juz") {
      setActiveTab("surah");
    } else if (page === "bookmarks") {
      setActiveTab("bookmarks");
    } else if (page === "home") {
      setActiveTab("home");
    }
    if (chapterId) setSelectedChapter(chapterId);
    setInitialVerse(verseNumber);
  };

  const handleOnboardingComplete = () => {
    setItem('onboardingCompleted', 'true');
    setShowOnboarding(false);
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {/* Splash screen on every launch */}
          {showSplash && (
            <SplashScreen onFinish={() => setSplashAnimDone(true)} />
          )}

          {/* Show onboarding on first launch */}
          {!showSplash && showOnboarding && (
            <OnboardingScreen
              onComplete={handleOnboardingComplete}
              arabicFontSize={arabicFontSize}
              onArabicFontSizeChange={setArabicFontSize}
              translationFontSize={translationFontSize}
              onTranslationFontSizeChange={setTranslationFontSize}
              transliterationFontSize={transliterationFontSize}
              onTransliterationFontSizeChange={setTransliterationFontSize}
              darkMode={darkMode}
            />
          )}

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
                initialVerse={initialVerse}
                onBack={() => {
                  setCurrentPage("surah-juz");
                  setActiveTab("surah");
                }}
                showTransliteration={transliteration}
                showTranslation={showTranslation}
                onNavigate={handleNavigate}
                reciter={reciter}
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
                arabicScript={arabicScript}
                onArabicScriptChange={setArabicScript}
                layoutMode={layoutMode}
                onLayoutModeChange={setLayoutMode}
              />
            )}
            {currentPage === "bookmarks" && (
              <Bookmarks onNavigate={handleNavigate} activeTab={activeTab} />
            )}
            {currentPage === "settings" && (
              <Settings
                onBack={() => {
                  setCurrentPage("home");
                  setActiveTab("home");
                }}
                onNavigate={handleNavigate}
                onRegisterBackHandler={(handler) => { settingsBackHandlerRef.current = handler; }}
                darkMode={darkMode}
                onDarkModeChange={setDarkMode}
                transliteration={transliteration}
                onTransliterationChange={setTransliteration}
                showTranslation={showTranslation}
                onShowTranslationChange={setShowTranslation}
                arabicScript={arabicScript}
                onArabicScriptChange={setArabicScript}
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
            {currentPage === "privacy-policy" && (
              <PrivacyPolicy
                onBack={() => {
                  setCurrentPage("settings");
                  setActiveTab("settings");
                }}
              />
            )}
            {currentPage === "terms-of-service" && (
              <TermsOfService
                onBack={() => {
                  setCurrentPage("settings");
                  setActiveTab("settings");
                }}
              />
            )}
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
}

export default App;
