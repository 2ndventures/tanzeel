import { useState, useEffect, useRef, useCallback } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import HomePage from "@/pages/HomePage";
import SurahJuz from "@/pages/SurahJuz";
import ChapterView from "@/pages/ChapterView";
import Settings from "@/pages/Settings";
import Bookmarks from "@/pages/Bookmarks";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import AudioManager from "@/pages/AudioManager";
import OnboardingScreen from "@/components/OnboardingScreen";
import SplashScreen from "@/components/SplashScreen";
import MiniPlayer from "@/components/MiniPlayer";
import BottomNav from "@/components/BottomNav";
import { AudioProvider } from "@/contexts/AudioContext";
import { DEFAULT_RECITER, getLegacyReciterId, isValidReciterId, LEGACY_RECITER_MAP } from "@/lib/reciters";
import type { LayoutMode } from "@/lib/quranMetadata";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { initStorage, getItem, setItem, removeItem } from "@/lib/storage";
import { initAudioCache } from "@/services/audioCache";
import { triggerHaptic } from "@/lib/haptics";

const CapApp = registerPlugin<{
  exitApp: () => Promise<void>;
  addListener: (eventName: string, callback: () => void) => Promise<{ remove: () => void }>;
}>('App');

type Page = "home" | "surah-juz" | "chapter" | "settings" | "bookmarks" | "privacy-policy" | "terms-of-service" | "audio-manager";

const PAGE_DEPTH: Record<Page, number> = {
  "home": 0,
  "surah-juz": 0,
  "bookmarks": 0,
  "settings": 0,
  "chapter": 1,
  "audio-manager": 1,
  "privacy-policy": 1,
  "terms-of-service": 1,
};

type NavDirection = "forward" | "back" | "tab";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [prevPage, setPrevPage] = useState<Page | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [initialVerse, setInitialVerse] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"home" | "surah" | "settings" | "bookmarks">("home");
  const [navDirection, setNavDirection] = useState<NavDirection>("tab");
  
  const [showSplash, setShowSplash] = useState(true);
  const [storageReady, setStorageReady] = useState(false);
  const [splashAnimDone, setSplashAnimDone] = useState(false);

  useEffect(() => {
    if (storageReady && splashAnimDone) {
      setShowSplash(false);
    }
  }, [storageReady, splashAnimDone]);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      const interactive = target.closest(
        'button, [role="button"], [role="tab"], [role="option"], [role="menuitem"], [role="radio"]'
      );
      if (interactive) triggerHaptic('light');
    };
    document.addEventListener('pointerdown', handler, { passive: true });
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  
  const [arabicScript, setArabicScript] = useState<'uthmani' | 'indopak' | 'tajweed'>('uthmani');
  const [reciter, setReciter] = useState(DEFAULT_RECITER);
  const [audioCacheReady, setAudioCacheReady] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [repeat, setRepeat] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('standard');
  const [translation, setTranslation] = useState("English");
  const [arabicFontSize, setArabicFontSize] = useState("Large");
  const [translationFontSize, setTranslationFontSize] = useState("Medium");
  const [transliterationFontSize, setTransliterationFontSize] = useState("Off");

  const showTranslation = translationFontSize !== "Off";
  const transliteration = transliterationFontSize !== "Off";
  const [lineSpacing, setLineSpacing] = useState("Normal");
  const [showVerseNumbers, setShowVerseNumbers] = useState(true);

  useEffect(() => {
    initStorage().then(async () => {
      const completed = await getItem('onboardingCompleted');
      setShowOnboarding(!completed);

      const savedDark = await getItem('darkMode');
      if (savedDark !== null) setDarkMode(JSON.parse(savedDark));

      const savedTranslit = await getItem('transliteration');
      const savedTranslation = await getItem('showTranslation');

      const savedScript = await getItem('arabicScript');
      if (savedScript === 'indopak' || savedScript === 'tajweed') setArabicScript(savedScript);

      const savedReciter = await getItem('reciter');
      if (savedReciter) {
        const trimmedId = savedReciter.trim();
        const migratedId = getLegacyReciterId(trimmedId);
        if (migratedId !== DEFAULT_RECITER || trimmedId in LEGACY_RECITER_MAP) {
          await setItem('reciter', migratedId);
          setReciter(migratedId);
        } else if (isValidReciterId(trimmedId)) {
          setReciter(trimmedId);
        } else {
          await setItem('reciter', DEFAULT_RECITER);
        }
      }

      const savedAutoScroll = await getItem('autoScroll');
      if (savedAutoScroll !== null) setAutoScroll(JSON.parse(savedAutoScroll));

      const savedRepeat = await getItem('repeat');
      if (savedRepeat !== null) setRepeat(JSON.parse(savedRepeat));

      const savedAutoplay = await getItem('autoplay');
      if (savedAutoplay !== null) setAutoplay(JSON.parse(savedAutoplay));

      const savedLayout = await getItem('layoutMode');
      if (savedLayout === 'focused-flow' || savedLayout === 'mushaf') setLayoutMode(savedLayout);

      const savedArabicFont = await getItem('arabicFontSize');
      if (savedArabicFont) setArabicFontSize(savedArabicFont);

      const savedTransFont = await getItem('translationFontSize');
      const savedTranslitFont = await getItem('transliterationFontSize');
      const toggleMigrated = await getItem('toggleMigrationDone');

      if (!toggleMigrated) {
        if (savedTranslation !== null && !JSON.parse(savedTranslation)) {
          setTranslationFontSize("Off");
          await setItem('translationFontSize', "Off");
        } else if (savedTransFont) {
          setTranslationFontSize(savedTransFont);
        }

        if (savedTranslit !== null && !JSON.parse(savedTranslit)) {
          setTransliterationFontSize("Off");
          await setItem('transliterationFontSize', "Off");
        } else if (savedTranslitFont) {
          setTransliterationFontSize(savedTranslitFont);
        } else if (savedTranslit !== null && JSON.parse(savedTranslit)) {
          setTransliterationFontSize("Small");
          await setItem('transliterationFontSize', "Small");
        }

        await setItem('toggleMigrationDone', 'true');
      } else {
        if (savedTransFont) setTranslationFontSize(savedTransFont);
        if (savedTranslitFont) setTransliterationFontSize(savedTranslitFont);
      }

      const savedSpacing = await getItem('lineSpacing');
      if (savedSpacing) setLineSpacing(savedSpacing);

      const savedVerseNums = await getItem('showVerseNumbers');
      if (savedVerseNums !== null) setShowVerseNumbers(JSON.parse(savedVerseNums));

      const savedTranslationLang = await getItem('translation');
      if (savedTranslationLang) setTranslation(savedTranslationLang);

      setStorageReady(true);

      initAudioCache()
        .then(() => setAudioCacheReady(true))
        .catch((err) => {
          console.error('[App] Failed to initialize audio cache:', err);
          setAudioCacheReady(true);
        });
    });
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    const themeColor = darkMode ? '#101828' : '#F8F2E4';
    let meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', themeColor);
    if (storageReady) setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode, storageReady]);

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

  useEffect(() => {
    if (!storageReady) return;
    setItem('translation', translation);
  }, [translation, storageReady]);

  const settingsBackHandlerRef = useRef<(() => boolean) | null>(null);

  const TRANSITION_DURATION = 300;

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  const navigateTo = useCallback((page: Page, direction: NavDirection) => {
    if (page === currentPage) return;
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    setNavDirection(direction);
    setPrevPage(currentPage);
    setCurrentPage(page);
    setIsTransitioning(true);
    transitionTimerRef.current = setTimeout(() => {
      setPrevPage(null);
      setIsTransitioning(false);
      transitionTimerRef.current = null;
    }, direction === "tab" ? 200 : TRANSITION_DURATION);
  }, [currentPage]);

  const handleBackButton = useCallback(() => {
    switch (currentPage) {
      case "privacy-policy":
      case "terms-of-service":
      case "audio-manager":
        navigateTo("settings", "back");
        setActiveTab("settings");
        break;
      case "chapter":
        navigateTo("surah-juz", "back");
        setActiveTab("surah");
        break;
      case "settings":
        if (settingsBackHandlerRef.current && settingsBackHandlerRef.current()) {
          break;
        }
        navigateTo("home", "back");
        setActiveTab("home");
        break;
      case "surah-juz":
      case "bookmarks":
        navigateTo("home", "back");
        setActiveTab("home");
        break;
      case "home":
      default:
        CapApp.exitApp();
        break;
    }
  }, [currentPage, navigateTo]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    const listener = CapApp.addListener('backButton', handleBackButton);
    return () => {
      listener.then(l => l.remove());
    };
  }, [handleBackButton]);

  const handleNavigate = (page: string, chapterId?: number, tab?: "home" | "surah" | "settings" | "bookmarks", verseNumber?: number) => {
    (document.activeElement as HTMLElement)?.blur();
    const targetPage = page as Page;
    const fromDepth = PAGE_DEPTH[currentPage] ?? 0;
    const toDepth = PAGE_DEPTH[targetPage] ?? 0;
    let direction: NavDirection;
    if (toDepth > fromDepth) {
      direction = "forward";
    } else if (toDepth < fromDepth) {
      direction = "back";
    } else {
      direction = "tab";
    }
    navigateTo(targetPage, direction);
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

  const renderPage = useCallback((page: Page) => {
    switch (page) {
      case "home":
        return <HomePage onNavigate={handleNavigate} activeTab={activeTab} />;
      case "surah-juz":
        return <SurahJuz onNavigate={handleNavigate} activeTab={activeTab} currentReciterId={reciter} audioCacheReady={audioCacheReady} />;
      case "chapter":
        return (
          <ChapterView
            chapterId={selectedChapter}
            initialVerse={initialVerse}
            onBack={() => {
              navigateTo("surah-juz", "back");
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
        );
      case "bookmarks":
        return <Bookmarks onNavigate={handleNavigate} activeTab={activeTab} />;
      case "settings":
        return (
          <Settings
            onBack={() => {
              navigateTo("home", "back");
              setActiveTab("home");
            }}
            onNavigate={handleNavigate}
            onRegisterBackHandler={(handler) => { settingsBackHandlerRef.current = handler; }}
            darkMode={darkMode}
            onDarkModeChange={setDarkMode}
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
        );
      case "privacy-policy":
        return (
          <PrivacyPolicy
            onBack={() => {
              navigateTo("settings", "back");
              setActiveTab("settings");
            }}
          />
        );
      case "terms-of-service":
        return (
          <TermsOfService
            onBack={() => {
              navigateTo("settings", "back");
              setActiveTab("settings");
            }}
          />
        );
      case "audio-manager":
        return (
          <AudioManager
            onBack={() => {
              navigateTo("settings", "back");
              setActiveTab("settings");
            }}
            reciter={reciter}
          />
        );
      default:
        return null;
    }
  }, [handleNavigate, activeTab, reciter, audioCacheReady, selectedChapter, initialVerse,
      transliteration, showTranslation, autoScroll, repeat, autoplay, darkMode,
      arabicFontSize, translationFontSize, transliterationFontSize, lineSpacing,
      showVerseNumbers, arabicScript, layoutMode, translation, navigateTo]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {showSplash && (
            <SplashScreen onFinish={() => setSplashAnimDone(true)} />
          )}

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
              onDarkModeChange={setDarkMode}
            />
          )}

          {storageReady && !showOnboarding && (<AudioProvider reciter={reciter} repeat={repeat} autoplay={autoplay}>
            <div className="h-full">
              <div className={isTransitioning ? "page-transition-container" : "h-full"}>
                {isTransitioning && prevPage && (
                  <div key={`exit-${prevPage}`} className={`page-layer page-exit-${navDirection}`}>
                    {renderPage(prevPage)}
                  </div>
                )}
                <div
                  key={currentPage}
                  className={isTransitioning ? `page-layer page-enter-${navDirection}` : "page-layer-static"}
                >
                  {renderPage(currentPage)}
                </div>
              </div>
            <div className={["chapter", "privacy-policy", "terms-of-service", "audio-manager"].includes(currentPage) ? "hidden" : ""}>
              <BottomNav
                activeTab={activeTab}
                onTabChange={(tab) => {
                  const pageMap: Record<string, string> = {
                    home: "home",
                    surah: "surah-juz",
                    bookmarks: "bookmarks",
                    settings: "settings",
                  };
                  handleNavigate(pageMap[tab], undefined, tab);
                }}
              />
            </div>
            <MiniPlayer
              visible={currentPage !== "chapter"}
              hasBottomNav={!["chapter", "privacy-policy", "terms-of-service", "audio-manager"].includes(currentPage)}
              onNavigateToChapter={(chapterId) => {
                handleNavigate("chapter", chapterId);
              }}
            />
          </div>
        </AudioProvider>)}
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
}

export default App;
