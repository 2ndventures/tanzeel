import { useEffect, useRef, useCallback, useState } from "react";
import { Icon } from "@iconify/react";
import { ArrowLeft, MoreVertical, Check, Sun, Moon, ChevronRight, ChevronLeft } from "lucide-react";
import VerseCard from "@/components/VerseCard";
import AudioPlayer from "@/components/AudioPlayer";
import FocusedFlowView from "@/components/FocusedFlowView";
import MushafPageView from "@/components/MushafPageView";
import HifzView from "@/components/HifzView";
import ScientificView from "@/components/ScientificView";
import { StatusBarShim } from "@/components/StatusBarShim";
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
            const headerHeight = headerElement ? headerElement.getBoundingClientRect().height : (isCollapsed ? 70 : 120);
            
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

      {/* Status Bar Shim */}
      <StatusBarShim />

      {/* Collapsible Header */}
      <div className={`fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border header-safe-padding header-transition ${isCollapsed ? 'header-collapsed' : 'header-expanded'}`}>
        <div className="relative overflow-hidden">
          {/* Glass background */}
          <div className="absolute inset-0 bg-card/80 dark:bg-slate-900/80 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          
          <div className="relative flex items-center justify-between px-6 py-6 shadow-xl">
            <button 
              className="flex size-12 items-center justify-center rounded-full bg-muted/60 dark:bg-slate-800/60 backdrop-blur-xl shadow-md hover-elevate active-elevate-2 ring-1 ring-border"
              onClick={onBack}
              aria-label="Go back to surahs list"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} aria-hidden="true" />
            </button>
            
            <div className="flex flex-col items-center flex-1 mx-4">
              <h1 className="text-2xl font-bold text-foreground mb-1" style={{textShadow: '0 2px 8px rgba(0,0,0,0.1)'}} data-testid="text-chapter-title-english">
                {chapterId}. {chapterInfo?.englishName || 'Al-Fatihah'}
              </h1>
              <p className="text-sm text-muted-foreground" data-testid="text-surah-number">
                {chapterInfo?.revelationType || 'The Opening'}
              </p>
            </div>
            
            <Sheet open={isMenuOpen} onOpenChange={(open) => { setIsMenuOpen(open); if (!open) setMenuView('main'); }}>
              <SheetTrigger asChild>
                <button 
                  className="flex size-12 items-center justify-center rounded-full bg-muted/60 dark:bg-slate-800/60 backdrop-blur-xl shadow-md hover-elevate active-elevate-2 ring-1 ring-border" 
                  aria-label="Open menu for display settings and reciter selection"
                  data-testid="button-menu"
                >
                  <MoreVertical className="w-5 h-5 text-foreground" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} aria-hidden="true" />
                </button>
              </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh]">
              <SheetHeader className="mb-4">
                {menuView !== 'main' && (
                  <Button variant="ghost" size="icon" className="absolute left-4 top-4 min-h-[48px] min-w-[48px]" onClick={() => setMenuView('main')}>
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                )}
                <SheetTitle className="text-xl">
                  {menuView === 'main' && 'Options'}
                  {menuView === 'display' && 'Display Options'}
                  {menuView === 'reciter' && 'Select Reciter'}
                  {menuView === 'arabic' && 'Arabic Text Size'}
                  {menuView === 'translation' && 'Translation Text Size'}
                  {menuView === 'transliteration' && 'Transliteration Text Size'}
                  {menuView === 'spacing' && 'Line Spacing'}
                  {menuView === 'script' && 'Arabic Script'}
                </SheetTitle>
              </SheetHeader>

              <div className="overflow-y-auto h-[calc(85vh-80px)] pb-16">
                {menuView === 'main' && (
                  <div className="space-y-6">
                    {/* Arabic Text Size Section - Prioritized at top */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-3" data-testid="section-arabic-size">
                        Arabic Text Size
                      </h3>
                      <div className="grid grid-cols-2 gap-2 px-2">
                        {["Small", "Medium", "Large", "Extra Large"].map((size) => (
                          <button
                            key={size}
                            onClick={() => onArabicFontSizeChange?.(size)}
                            className={`p-4 min-h-[70px] rounded-xl hover-elevate active-elevate-2 flex flex-col items-center justify-center gap-2 transition-all ${
                              arabicFontSize === size 
                                ? 'bg-primary/20 ring-2 ring-primary text-primary' 
                                : 'bg-muted/40 dark:bg-slate-800/40'
                            }`}
                            data-testid={`button-arabic-size-${size.toLowerCase().replace(' ', '-')}`}
                          >
                            <span className={`font-arabic ${
                              size === "Small" ? "text-xl" :
                              size === "Medium" ? "text-2xl" :
                              size === "Large" ? "text-3xl" :
                              "text-4xl"
                            }`}>أ</span>
                            <span className="text-xs font-semibold">{size}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Arabic Script Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-3" data-testid="section-arabic-script">
                        Arabic Script
                      </h3>
                      <div className="grid grid-cols-3 gap-2 px-2">
                        {([
                          { value: 'uthmani', label: 'Uthmani' },
                          { value: 'indopak', label: 'IndoPak' },
                          { value: 'tajweed', label: 'Tajweed' },
                        ] as const).map((option) => (
                          <button
                            key={option.value}
                            onClick={() => onArabicScriptChange?.(option.value)}
                            className={`p-4 min-h-[56px] rounded-xl hover-elevate active-elevate-2 flex items-center justify-center transition-all ${
                              arabicScript === option.value
                                ? 'bg-primary/20 ring-2 ring-primary text-primary'
                                : 'bg-muted/40 dark:bg-slate-800/40'
                            }`}
                            data-testid={`button-script-${option.value}`}
                          >
                            <span className="text-sm font-semibold">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Translation Text Size Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-3" data-testid="section-translation-size">
                        Translation Text Size
                      </h3>
                      <div className="grid grid-cols-3 gap-2 px-2">
                        {["Small", "Medium", "Large"].map((size) => (
                          <button
                            key={size}
                            onClick={() => onTranslationFontSizeChange?.(size)}
                            className={`p-4 min-h-[70px] rounded-xl hover-elevate active-elevate-2 flex flex-col items-center justify-center gap-2 transition-all ${
                              translationFontSize === size 
                                ? 'bg-primary/20 ring-2 ring-primary text-primary' 
                                : 'bg-muted/40 dark:bg-slate-800/40'
                            }`}
                            data-testid={`button-translation-size-${size.toLowerCase()}`}
                          >
                            <span className={`font-semibold ${
                              size === "Small" ? "text-sm" :
                              size === "Medium" ? "text-base" :
                              "text-lg"
                            }`}>A</span>
                            <span className="text-xs font-semibold">{size}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Transliteration Text Size Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-3" data-testid="section-transliteration-size">
                        Transliteration Text Size
                      </h3>
                      <div className="grid grid-cols-3 gap-2 px-2">
                        {["Small", "Medium", "Large"].map((size) => (
                          <button
                            key={size}
                            onClick={() => onTransliterationFontSizeChange?.(size)}
                            className={`p-4 min-h-[70px] rounded-xl hover-elevate active-elevate-2 flex flex-col items-center justify-center gap-2 transition-all ${
                              transliterationFontSize === size 
                                ? 'bg-primary/20 ring-2 ring-primary text-primary' 
                                : 'bg-muted/40 dark:bg-slate-800/40'
                            }`}
                            data-testid={`button-transliteration-size-${size.toLowerCase()}`}
                          >
                            <span className={`italic font-medium ${
                              size === "Small" ? "text-xs" :
                              size === "Medium" ? "text-sm" :
                              "text-base"
                            }`}>A</span>
                            <span className="text-xs font-semibold">{size}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Audio Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-3" data-testid="section-audio">
                        Audio
                      </h3>
                      <div className="space-y-1">
                        <button
                          onClick={() => setMenuView('reciter')}
                          className="w-full flex items-center justify-between p-4 min-h-[60px] hover-elevate active-elevate-2 rounded-md"
                          data-testid="menu-item-reciter"
                        >
                          <span className="text-lg">Reciter</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{getReciterById(reciter)?.name || 'Mishary Alafasy'}</span>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </button>

                        <div className="flex items-center justify-between p-4 min-h-[60px]" data-testid="menu-item-autoplay">
                          <span className="text-lg">Autoplay next surah</span>
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
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-3" data-testid="section-display">
                        Display
                      </h3>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between p-4 min-h-[60px]" data-testid="menu-item-theme">
                          <span className="text-lg">Theme</span>
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
                          <span className="text-lg">Transliteration</span>
                          <Switch 
                            checked={showTransliteration} 
                            onCheckedChange={onTransliterationChange}
                            data-testid="switch-transliteration"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4" data-testid="menu-item-translation">
                          <span className="text-lg">Translation</span>
                          <Switch 
                            checked={showTranslation} 
                            onCheckedChange={onShowTranslationChange}
                            data-testid="switch-translation"
                          />
                        </div>
                      </div>
                    </div>

                    {/* More Options Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-3" data-testid="section-more-options">
                        More Options
                      </h3>
                      <div className="space-y-1">
                        <button
                          onClick={() => setMenuView('display')}
                          className="w-full flex items-center justify-between p-4 min-h-[60px] hover-elevate active-elevate-2 rounded-md"
                          data-testid="menu-item-display"
                        >
                          <span className="text-lg">Verse numbers & line spacing</span>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {menuView === 'display' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-4" data-testid="menu-item-verse-numbers">
                      <span className="text-lg">Verse numbers</span>
                      <Switch 
                        checked={showVerseNumbers} 
                        onCheckedChange={onShowVerseNumbersChange}
                        data-testid="switch-verse-numbers"
                      />
                    </div>

                    <button
                      onClick={() => setMenuView('arabic')}
                      className="w-full flex items-center justify-between p-4 hover-elevate active-elevate-2 rounded-md"
                    >
                      <span className="text-lg">Arabic text</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{arabicFontSize}</span>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </button>

                    <button
                      onClick={() => setMenuView('translation')}
                      className="w-full flex items-center justify-between p-4 hover-elevate active-elevate-2 rounded-md"
                    >
                      <span className="text-lg">Translation text</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{translationFontSize}</span>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </button>

                    <button
                      onClick={() => setMenuView('transliteration')}
                      className="w-full flex items-center justify-between p-4 hover-elevate active-elevate-2 rounded-md"
                    >
                      <span className="text-lg">Transliteration text</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{transliterationFontSize}</span>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </button>

                    <button
                      onClick={() => setMenuView('spacing')}
                      className="w-full flex items-center justify-between p-4 hover-elevate active-elevate-2 rounded-md"
                    >
                      <span className="text-lg">Line spacing</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{lineSpacing}</span>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </button>
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
                          <span className="text-lg">{r.name}</span>
                          <span className="text-sm text-muted-foreground">{r.arabicName}</span>
                        </div>
                        {reciter === r.id && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}

                {menuView === 'arabic' && (
                  <div className="space-y-1">
                    {["Small", "Medium", "Large", "Extra Large"].map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          onArabicFontSizeChange?.(size);
                          setMenuView('display');
                        }}
                        className="w-full flex items-center justify-between p-4 hover-elevate active-elevate-2 rounded-md"
                      >
                        <span className="text-lg">{size}</span>
                        {arabicFontSize === size && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}

                {menuView === 'translation' && (
                  <div className="space-y-1">
                    {["Small", "Medium", "Large"].map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          onTranslationFontSizeChange?.(size);
                          setMenuView('display');
                        }}
                        className="w-full flex items-center justify-between p-4 hover-elevate active-elevate-2 rounded-md"
                      >
                        <span className="text-lg">{size}</span>
                        {translationFontSize === size && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}

                {menuView === 'transliteration' && (
                  <div className="space-y-1">
                    {["Small", "Medium", "Large"].map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          onTransliterationFontSizeChange?.(size);
                          setMenuView('display');
                        }}
                        className="w-full flex items-center justify-between p-4 hover-elevate active-elevate-2 rounded-md"
                      >
                        <span className="text-lg">{size}</span>
                        {transliterationFontSize === size && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}

                {menuView === 'spacing' && (
                  <div className="space-y-1">
                    {["Compact", "Normal", "Relaxed", "Loose"].map((spacing) => (
                      <button
                        key={spacing}
                        onClick={() => {
                          onLineSpacingChange?.(spacing);
                          setMenuView('display');
                        }}
                        className="w-full flex items-center justify-between p-4 hover-elevate active-elevate-2 rounded-md"
                      >
                        <span className="text-lg">{spacing}</span>
                        {lineSpacing === spacing && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
          </div>
        </div>
      </div>

      {/* Content area - Standard / Focused Flow / Mushaf */}
      {layoutMode === 'standard' ? (
        <div
          ref={scrollContainerRef}
          className={`relative flex-1 overflow-y-auto px-6 pb-[240px] transition-[padding] duration-300 ${
            isCollapsed ? 'pt-[100px]' : 'pt-[180px]'
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
      ) : layoutMode === 'scientific' ? (
        <ScientificView
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
        layoutMode={layoutMode}
        onLayoutModeChange={onLayoutModeChange}
        compact={layoutMode === 'scientific'}
      />
    </div>
  );
}
