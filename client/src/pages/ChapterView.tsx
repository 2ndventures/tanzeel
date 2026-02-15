import { useEffect, useRef, useCallback, useState } from "react";
import { Icon } from "@iconify/react";
import { ArrowLeft, Check, Sun, Moon, ChevronRight, ChevronLeft } from "lucide-react";
import VerseCard from "@/components/VerseCard";
import AudioPlayer from "@/components/AudioPlayer";
import FocusedFlowView from "@/components/FocusedFlowView";
import MushafPageView from "@/components/MushafPageView";
import HifzView from "@/components/HifzView";
import { useCollapsibleHeader } from "@/hooks/useCollapsibleHeader";
import { chapters, getDisplayArabicName, Verse, LayoutMode } from "@/lib/quranMetadata";
import { lazyChapterService } from "@/services/lazyChapterService";
import { useWordTimingAudio } from "@/hooks/useWordTimingAudio";
import { getFeaturedReciters, getReciterById } from "@/lib/reciters";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { incrementVersesRead, addReadingTime } from "@/lib/readingStats";

interface ChapterViewProps {
  chapterId: number;
  onBack: () => void;
  showTransliteration: boolean;
  showTranslation: boolean;
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings") => void;
  reciter: string;
  autoScroll: boolean;
  repeat: boolean;
  autoplay: boolean;
  darkMode: boolean;
  onAutoScrollChange: (enabled: boolean) => void;
  onRepeatChange: (enabled: boolean) => void;
  onAutoplayChange: (enabled: boolean) => void;
  onDarkModeChange: (enabled: boolean) => void;
  onTransliterationChange: (enabled: boolean) => void;
  onShowTranslationChange: (enabled: boolean) => void;
  onReciterChange: (reciter: string) => void;
  arabicFontSize: string;
  translationFontSize: string;
  transliterationFontSize: string;
  lineSpacing: string;
  showVerseNumbers: boolean;
  onArabicFontSizeChange?: (size: string) => void;
  onTranslationFontSizeChange?: (size: string) => void;
  onTransliterationFontSizeChange?: (size: string) => void;
  onLineSpacingChange?: (spacing: string) => void;
  onShowVerseNumbersChange?: (enabled: boolean) => void;
  arabicScript?: 'uthmani' | 'indopak' | 'tajweed';
  onArabicScriptChange?: (script: 'uthmani' | 'indopak' | 'tajweed') => void;
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
}

export default function ChapterView({ 
  chapterId, 
  onBack, 
  showTransliteration, 
  showTranslation,
  onNavigate,
  reciter,
  autoScroll,
  repeat,
  autoplay,
  darkMode,
  onAutoScrollChange,
  onRepeatChange,
  onAutoplayChange,
  onDarkModeChange,
  onTransliterationChange,
  onShowTranslationChange,
  onReciterChange,
  arabicFontSize,
  translationFontSize,
  transliterationFontSize,
  lineSpacing,
  showVerseNumbers,
  onArabicFontSizeChange,
  onTranslationFontSizeChange,
  onTransliterationFontSizeChange,
  onLineSpacingChange,
  onShowVerseNumbersChange,
  arabicScript = 'uthmani',
  onArabicScriptChange,
  layoutMode,
  onLayoutModeChange,
}: ChapterViewProps) {
  const chapterInfo = chapters.find(ch => ch.id === chapterId);
  
  // Lazy loading state for verses
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoadingVerses, setIsLoadingVerses] = useState(true);
  const [versesError, setVersesError] = useState<string | null>(null);
  
  // Collapsible header hook
  const { isCollapsed, scrollContainerRef } = useCollapsibleHeader();
  
  // State for managing menu navigation
  const [menuView, setMenuView] = useState<'main' | 'display' | 'reciter' | 'arabic' | 'translation' | 'transliteration' | 'spacing' | 'script'>('main');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Map our reciter IDs to Quran.com reciter IDs
  // https://api.qurancdn.com/api/qdc/audio/reciters
  const reciterToQuranComId: { [key: string]: number } = {
    'alafasy': 7,           // Mishary Rashid Alafasy
    'abdul_basit': 1,       // Abdul Basit Abdul Samad (Murattal)
    'abdul_basit_mujawwad': 2, // Abdul Basit (Mujawwad)
    'sudais': 12,           // Abdurrahmaan As-Sudais
    'ash_shaatree': 5,      // Abu Bakr Ash-Shaatree
    'hudhaify': 3,          // Ali Al-Hudhaify
    'hani_rifai': 9,        // Hani Rifai
    'akram_alalaqimy': 11,  // Akram Al-Alaqimy
  };
  const quranComReciterId = reciterToQuranComId[reciter] || 7;

  // Load verses when chapter changes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingVerses(true);
    setVersesError(null);
    
    lazyChapterService.getVerses(chapterId, arabicScript)
      .then(loadedVerses => {
        // Only update state if this is still the current chapter
        if (isMounted) {
          setVerses(loadedVerses);
          setIsLoadingVerses(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error('Failed to load chapter verses:', err);
          setVersesError('Failed to load chapter verses. Please try again.');
          setIsLoadingVerses(false);
        }
      });
    
    // Scroll to top when chapter changes
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    // Cleanup function to prevent race conditions
    return () => {
      isMounted = false;
    };
  }, [chapterId, arabicScript]);

  // Preload next chapter when autoplay is enabled
  useEffect(() => {
    if (autoplay && chapterId < 114) {
      lazyChapterService.preloadChapter(chapterId + 1, arabicScript);
    }
  }, [autoplay, chapterId]);

  // Track completed verses
  const completedVersesRef = useRef(new Set<string>());
  const lastTimeRef = useRef(0);

  // Use word-timing audio with continuous playback
  const {
    isPlaying,
    speed,
    currentVerseKey,
    currentWordIndex,
    isLoading,
    currentTime,
    duration,
    error,
    togglePlayPause,
    pauseAudio,
    playAudio,
    seek,
    setSpeed,
    seekToVerse,
  } = useWordTimingAudio(
    chapterId,
    quranComReciterId,
    repeat,
    (verseKey) => {
      // Track verse completion for stats
      if (!completedVersesRef.current.has(verseKey)) {
        completedVersesRef.current.add(verseKey);
        incrementVersesRead(1, verseKey);
      }

      if (autoScroll && scrollContainerRef.current) {
        // Parse verse key (e.g., "1:2" -> verse 2)
        const verseNumber = parseInt(verseKey.split(':')[1]);
        
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          const verseElement = document.querySelector(`[data-testid="card-verse-${verseNumber}"]`);
          const container = scrollContainerRef.current;
          
          if (verseElement && container) {
            // Get the header element to measure its actual height
            const headerElement = document.querySelector('.header-safe-padding');
            const headerHeight = headerElement ? headerElement.getBoundingClientRect().height : (isCollapsed ? 60 : 80);
            
            // Get the verse's and container's bounding rectangles
            const verseRect = (verseElement as HTMLElement).getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            // The verse's position relative to the container's current scroll position
            const verseRelativeTop = verseRect.top - containerRect.top + container.scrollTop;
            
            // We want the verse to appear below the fixed header with some breathing room
            // The container's top edge is at y=0, but the header overlays the first headerHeight pixels
            // So we need to scroll less to keep the verse visible below the header
            const breathingRoom = 20;
            const targetScroll = verseRelativeTop - headerHeight - breathingRoom;
            
            container.scrollTo({ 
              top: Math.max(0, targetScroll),
              behavior: 'smooth' 
            });
          }
        });
      }
    },
    () => {
      // Navigate to next surah when current one ends (autoplay will be handled by hook)
      goToNextSurah();
    },
    1.0,
    autoplay
  );
  
  // Show audio error as alert (for debugging mobile)
  useEffect(() => {
    if (error) {
      alert(`AUDIO ERROR: ${error}\n\nChapter: ${chapterId}\nReciter ID: ${quranComReciterId}\nReciter: ${reciter}`);
    }
  }, [error, chapterId, quranComReciterId, reciter]);
  
  // Track reading time
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        // Track 1 second of reading time
        addReadingTime(1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  // Reset completed verses when chapter changes
  useEffect(() => {
    completedVersesRef.current.clear();
  }, [chapterId]);

  // Extract current verse number from verse key
  const currentVerse = currentVerseKey ? parseInt(currentVerseKey.split(':')[1]) : 1;
  
  // Navigation functions for next/previous surah
  const goToNextSurah = useCallback(() => {
    const nextChapterId = chapterId + 1;
    if (nextChapterId <= 114) {
      onNavigate('chapter', nextChapterId);
    }
  }, [chapterId, onNavigate]);

  const handleVerseClick = useCallback((verseNumber: number) => {
    const verseKey = `${chapterId}:${verseNumber}`;
    const clickedCurrentVerse = currentVerse === verseNumber;
    
    if (clickedCurrentVerse && isPlaying) {
      // Clicking the currently playing verse pauses it
      pauseAudio();
    } else {
      // Clicking a different verse seeks to it and starts playback
      seekToVerse(verseKey);
      if (!isPlaying) {
        playAudio();
      }
    }
  }, [chapterId, currentVerse, seekToVerse, isPlaying, pauseAudio, playAudio]);

  const goToPreviousSurah = useCallback(() => {
    const prevChapterId = chapterId - 1;
    if (prevChapterId >= 1) {
      onNavigate('chapter', prevChapterId);
    }
  }, [chapterId, onNavigate]);

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-gradient-to-b from-background via-background/95 to-background">
      {/* Rich layered gradients for depth - adapts to theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/50 to-background/90 dark:from-indigo-900/30 dark:via-slate-900/50 dark:to-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-amber-500/8 via-transparent to-transparent dark:from-amber-500/10" />
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20 dark:to-black/30" />
      {/* Screen reader announcements for verse changes */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {currentVerseKey && `Now ${isPlaying ? 'playing' : 'at'} verse ${currentVerse} of ${verses.length}`}
      </div>
      {/* Gradient Fade Header */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 header-safe-padding header-transition ${isCollapsed && layoutMode === 'standard' ? 'header-collapsed' : 'header-expanded'}`}
        style={{ willChange: 'transform' }}
      >
        <header
          className="w-full"
          style={{
            background: 'linear-gradient(to bottom, var(--header-gradient-start) 0%, var(--header-gradient-mid) 60%, transparent 100%)',
            paddingBottom: '12px',
          }}
        >
          <div className="relative flex items-center justify-between px-5 pt-3 pb-1">
            {/* Left: Back button */}
            <button
              className="flex size-10 items-center justify-center transition-colors active:opacity-60 shrink-0"
              onClick={onBack}
              aria-label="Go back to surahs list"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5 text-foreground/80 dark:text-white/90" aria-hidden="true" />
            </button>

            {/* Center: Surah name + Arabic subtitle */}
            <div className="flex flex-col items-center flex-1 mx-3 min-w-0">
              <h1 className="text-[15px] font-semibold text-foreground/90 dark:text-white/95 tracking-tight truncate" data-testid="text-chapter-title-english">
                {chapterId}. {chapterInfo?.englishName || 'Al-Fatihah'}
              </h1>
              <p className="font-arabic text-muted-foreground dark:text-white/50 truncate text-[18px]" data-testid="text-surah-arabic-name">
                {chapterInfo ? getDisplayArabicName(chapterInfo.arabicName) : ''}
              </p>
            </div>

            {/* Right: Settings button */}
            <Sheet open={isMenuOpen} onOpenChange={(open) => { setIsMenuOpen(open); if (!open) setMenuView('main'); }}>
              <SheetTrigger asChild>
                <button
                  className="flex size-10 items-center justify-center transition-colors active:opacity-60 shrink-0"
                  aria-label="Open menu for display settings and reciter selection"
                  data-testid="button-menu"
                >
                  <Icon icon="solar:settings-linear" className="w-5 h-5 text-foreground/80 dark:text-white/90" aria-hidden="true" />
                </button>
              </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] bg-[#000000] border-white/10 flex flex-col">
              <SheetHeader className="mb-4 shrink-0">
                {menuView !== 'main' && (
                  <Button variant="ghost" size="icon" className="absolute left-4 top-4 min-h-[48px] min-w-[48px] text-white/80 hover:text-white" onClick={() => setMenuView('main')}>
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                )}
                <SheetTitle className="text-xl text-white/95">
                  {menuView === 'main' && 'Options'}
                  {menuView === 'reciter' && 'Select Reciter'}
                </SheetTitle>
              </SheetHeader>

              {menuView === 'main' && (
                <div className="shrink-0 px-4 pb-3" data-testid="options-live-preview">
                  <div className="rounded-xl bg-white/[0.04] px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Preview</p>
                    <div className={`transition-all duration-200 ${
                      lineSpacing === "Compact" ? "space-y-1" :
                      lineSpacing === "Normal" ? "space-y-2" :
                      lineSpacing === "Relaxed" ? "space-y-3" :
                      "space-y-4"
                    }`}>
                      <p
                        dir="rtl"
                        className={`${
                          arabicScript === 'indopak' ? 'font-indopak' : 'font-arabic'
                        } text-foreground transition-all duration-200 ${
                          arabicFontSize === "Small" ? "text-xl md:text-2xl" :
                          arabicFontSize === "Medium" ? "text-2xl md:text-3xl" :
                          arabicFontSize === "Large" ? "text-3xl md:text-4xl" :
                          "text-4xl md:text-5xl"
                        } ${
                          lineSpacing === "Compact" ? "leading-[2]" :
                          lineSpacing === "Normal" ? "leading-[2.4]" :
                          lineSpacing === "Relaxed" ? "leading-[2.8]" :
                          "leading-[3.2]"
                        }`}
                        data-testid="preview-arabic"
                      >
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                      </p>
                      {showTransliteration && (
                        <p
                          className={`italic text-muted-foreground transition-all duration-200 ${
                            transliterationFontSize === "Small" ? "text-xs" :
                            transliterationFontSize === "Medium" ? "text-sm" :
                            "text-base"
                          }`}
                          data-testid="preview-transliteration"
                        >
                          Bismi l-lāhi r-raḥmāni r-raḥīm
                        </p>
                      )}
                      {showTranslation && (
                        <p
                          className={`text-muted-foreground transition-all duration-200 ${
                            translationFontSize === "Small" ? "text-sm" :
                            translationFontSize === "Medium" ? "text-base" :
                            "text-lg"
                          }`}
                          data-testid="preview-translation"
                        >
                          In the name of Allah, the Entirely Merciful, the Especially Merciful.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-y-auto flex-1 pb-16">
                {menuView === 'main' && (
                  <div className="space-y-6">
                    {/* Text Size Section — consolidated */}
                    <div>
                      <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wide px-4 mb-3" data-testid="section-text-size">
                        Text Size
                      </h3>
                      <div className="space-y-2 px-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-white/80 shrink-0">Arabic</span>
                          <div className="flex gap-1.5">
                            {[{ label: "S", value: "Small" }, { label: "M", value: "Medium" }, { label: "L", value: "Large" }, { label: "XL", value: "Extra Large" }].map((s) => (
                              <button
                                key={s.value}
                                onClick={() => onArabicFontSizeChange?.(s.value)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                  arabicFontSize === s.value
                                    ? 'bg-primary/20 ring-1 ring-primary text-primary'
                                    : 'bg-white/[0.06] text-white/60'
                                }`}
                                data-testid={`button-arabic-size-${s.value.toLowerCase().replace(' ', '-')}`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-white/80 shrink-0">Translation</span>
                          <div className="flex gap-1.5">
                            {[{ label: "S", value: "Small" }, { label: "M", value: "Medium" }, { label: "L", value: "Large" }].map((s) => (
                              <button
                                key={s.value}
                                onClick={() => onTranslationFontSizeChange?.(s.value)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                  translationFontSize === s.value
                                    ? 'bg-primary/20 ring-1 ring-primary text-primary'
                                    : 'bg-white/[0.06] text-white/60'
                                }`}
                                data-testid={`button-translation-size-${s.value.toLowerCase()}`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-white/80 shrink-0">Transliteration</span>
                          <div className="flex gap-1.5">
                            {[{ label: "S", value: "Small" }, { label: "M", value: "Medium" }, { label: "L", value: "Large" }].map((s) => (
                              <button
                                key={s.value}
                                onClick={() => onTransliterationFontSizeChange?.(s.value)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                  transliterationFontSize === s.value
                                    ? 'bg-primary/20 ring-1 ring-primary text-primary'
                                    : 'bg-white/[0.06] text-white/60'
                                }`}
                                data-testid={`button-transliteration-size-${s.value.toLowerCase()}`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Arabic Script — inline */}
                    <div>
                      <div className="flex items-center justify-between gap-3 px-4">
                        <span className="text-sm text-white/80 shrink-0">Arabic Script</span>
                        <div className="flex gap-1.5">
                          {([
                            { value: 'uthmani', label: 'Uthmani' },
                            { value: 'indopak', label: 'IndoPak' },
                            { value: 'tajweed', label: 'Tajweed' },
                          ] as const).map((option) => (
                            <button
                              key={option.value}
                              onClick={() => onArabicScriptChange?.(option.value)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                arabicScript === option.value
                                  ? 'bg-primary/20 ring-1 ring-primary text-primary'
                                  : 'bg-white/[0.06] text-white/60'
                              }`}
                              data-testid={`button-script-${option.value}`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Line Spacing — inline */}
                    <div>
                      <div className="flex items-center justify-between gap-3 px-4">
                        <span className="text-sm text-white/80 shrink-0">Line Spacing</span>
                        <div className="flex gap-1.5">
                          {["Compact", "Normal", "Relaxed", "Loose"].map((spacing) => (
                            <button
                              key={spacing}
                              onClick={() => onLineSpacingChange?.(spacing)}
                              className={`px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                lineSpacing === spacing
                                  ? 'bg-primary/20 ring-1 ring-primary text-primary'
                                  : 'bg-white/[0.06] text-white/60'
                              }`}
                              data-testid={`button-spacing-${spacing.toLowerCase()}`}
                            >
                              {spacing}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Audio Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wide px-4 mb-3" data-testid="section-audio">
                        Audio
                      </h3>
                      <div className="space-y-1">
                        <button
                          onClick={() => setMenuView('reciter')}
                          className="w-full flex items-center justify-between p-4 min-h-[60px] hover-elevate active-elevate-2 rounded-md"
                          data-testid="menu-item-reciter"
                        >
                          <span className="text-lg text-white/90">Reciter</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white/45">{getReciterById(reciter)?.name || 'Mishary Alafasy'}</span>
                            <ChevronRight className="w-5 h-5 text-white/45" />
                          </div>
                        </button>

                        <div className="flex items-center justify-between p-4 min-h-[60px]" data-testid="menu-item-autoplay">
                          <span className="text-lg text-white/90">Autoplay next surah</span>
                          <Switch 
                            checked={autoplay} 
                            onCheckedChange={onAutoplayChange}
                            data-testid="switch-autoplay"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Display Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wide px-4 mb-3" data-testid="section-display">
                        Display
                      </h3>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between p-4 min-h-[60px]" data-testid="menu-item-theme">
                          <span className="text-lg text-white/90">Theme</span>
                          <div className="relative">
                            <Switch 
                              checked={darkMode} 
                              onCheckedChange={onDarkModeChange}
                              data-testid="switch-theme"
                              className="relative"
                            />
                            <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
                              <Sun className="w-3.5 h-3.5 text-yellow-500" />
                              <Moon className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4" data-testid="menu-item-transliteration">
                          <span className="text-lg text-white/90">Transliteration</span>
                          <Switch 
                            checked={showTransliteration} 
                            onCheckedChange={onTransliterationChange}
                            data-testid="switch-transliteration"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4" data-testid="menu-item-translation">
                          <span className="text-lg text-white/90">Translation</span>
                          <Switch 
                            checked={showTranslation} 
                            onCheckedChange={onShowTranslationChange}
                            data-testid="switch-translation"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4" data-testid="menu-item-verse-numbers">
                          <span className="text-lg text-white/90">Verse numbers</span>
                          <Switch 
                            checked={showVerseNumbers} 
                            onCheckedChange={onShowVerseNumbersChange}
                            data-testid="switch-verse-numbers"
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                )}


                {menuView === 'reciter' && (
                  <div className="space-y-1">
                    {getFeaturedReciters().map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          onReciterChange(r.id);
                          setMenuView('main');
                        }}
                        className="w-full flex items-center justify-between p-4 hover-elevate active-elevate-2 rounded-md"
                        data-testid={`reciter-option-${r.id}`}
                      >
                        <div className="flex flex-col items-start">
                          <span className="text-lg text-white/90">{r.name}</span>
                          <span className="text-sm text-white/45">{r.arabicName}</span>
                        </div>
                        {reciter === r.id && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}

              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      </div>
      {/* Content area - Standard / Focused Flow / Mushaf */}
      {layoutMode === 'standard' ? (
        <div
          ref={scrollContainerRef}
          className={`relative flex-1 overflow-y-auto px-6 pb-[260px] transition-[padding] duration-300 ${
            isCollapsed ? 'pt-[80px]' : 'pt-[100px]'
          }`}
        >
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Loading state */}
            {isLoadingVerses && (
              <>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-3 p-6 rounded-2xl bg-card/80 backdrop-blur-xl">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ))}
              </>
            )}

            {/* Error state */}
            {versesError && !isLoadingVerses && (
              <div className="text-center py-12 space-y-4">
                <Icon icon="mdi:alert-circle" className="w-16 h-16 mx-auto text-destructive" />
                <p className="text-lg text-destructive">{versesError}</p>
                <Button onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </div>
            )}

            {/* Verses */}
            {!isLoadingVerses && !versesError && verses.map((verse, index) => {
              const verseNumber = index + 1;
              const isCurrentVerse = currentVerse === verseNumber;

              return (
                <VerseCard
                  key={verseNumber}
                  chapterId={chapterId}
                  verseNumber={verseNumber}
                  arabicText={verse.arabicText}
                  transliteration={verse.transliteration}
                  translation={verse.translation}
                  showTransliteration={showTransliteration}
                  showTranslation={showTranslation}
                  isPlaying={isPlaying}
                  isCurrentVerse={isCurrentVerse}
                  isInVerseRange={isCurrentVerse}
                  currentWordIndex={isCurrentVerse ? currentWordIndex : null}
                  onClick={() => handleVerseClick(verseNumber)}
                  arabicFontSize={arabicFontSize}
                  translationFontSize={translationFontSize}
                  transliterationFontSize={transliterationFontSize}
                  lineSpacing={lineSpacing}
                  showVerseNumbers={showVerseNumbers}
                  arabicScript={arabicScript}
                />
              );
            })}
          </div>
        </div>
      ) : layoutMode === 'focused-flow' ? (
        <FocusedFlowView
          verses={verses}
          isLoadingVerses={isLoadingVerses}
          versesError={versesError}
          chapterId={chapterId}
          currentVerse={currentVerse}
          currentWordIndex={currentWordIndex}
          isPlaying={isPlaying}
          showTranslation={showTranslation}
          arabicFontSize={arabicFontSize}
          translationFontSize={translationFontSize}
          lineSpacing={lineSpacing}
          arabicScript={arabicScript}
          onVerseClick={handleVerseClick}
          isCollapsed={isCollapsed}
        />
      ) : layoutMode === 'hifz' ? (
        <HifzView
          verses={verses}
          isLoadingVerses={isLoadingVerses}
          versesError={versesError}
          chapterId={chapterId}
          currentVerse={currentVerse}
          currentWordIndex={currentWordIndex}
          isPlaying={isPlaying}
          showTranslation={showTranslation}
          arabicFontSize={arabicFontSize}
          translationFontSize={translationFontSize}
          lineSpacing={lineSpacing}
          arabicScript={arabicScript}
          onVerseClick={handleVerseClick}
          isCollapsed={isCollapsed}
        />
      ) : (
        <MushafPageView
          verses={verses}
          isLoadingVerses={isLoadingVerses}
          versesError={versesError}
          chapterId={chapterId}
          currentVerse={currentVerse}
          currentWordIndex={currentWordIndex}
          isPlaying={isPlaying}
          showTranslation={showTranslation}
          arabicFontSize={arabicFontSize}
          translationFontSize={translationFontSize}
          lineSpacing={lineSpacing}
          arabicScript={arabicScript}
          onVerseClick={handleVerseClick}
          isCollapsed={isCollapsed}
        />
      )}
      <AudioPlayer
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        speed={speed}
        isLoading={isLoading}
        repeat={repeat}
        onPlayPause={togglePlayPause}
        onSeek={seek}
        onSpeedChange={setSpeed}
        onPrevious={goToPreviousSurah}
        onNext={goToNextSurah}
        onRepeatChange={onRepeatChange}
        surahNumber={chapterId}
        surahNameArabic={chapterInfo ? getDisplayArabicName(chapterInfo.arabicName) : undefined}
        surahNameEnglish={chapterInfo?.englishName}
        reciterName={getReciterById(reciter)?.name}
        layoutMode={layoutMode}
        onLayoutModeChange={onLayoutModeChange}
        compact={false}
      />
    </div>
  );
}
