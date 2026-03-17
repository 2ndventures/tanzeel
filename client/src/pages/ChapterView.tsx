import { useEffect, useRef, useCallback, useState } from "react";
import { Icon } from "@iconify/react";
import { ArrowLeft, Check, ChevronRight, ChevronLeft, ChevronDown, Play, Pause, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
import { useMediaSession } from "@/hooks/useMediaSession";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { incrementVersesRead, addReadingTime } from "@/lib/readingStats";
import TajweedLegend from "@/components/TajweedLegend";
import { triggerHaptic } from "@/lib/haptics";

interface ChapterViewProps {
  chapterId: number;
  initialVerse?: number;
  onBack: () => void;
  showTransliteration: boolean;
  showTranslation: boolean;
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings" | "bookmarks") => void;
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
  initialVerse,
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
  
  const didSeekRef = useRef(false);
  const userScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticScrollUntilRef = useRef(0);

  const markProgrammaticScroll = useCallback(() => {
    programmaticScrollUntilRef.current = Date.now() + 800;
  }, []);

  // Auto-hide header in focused-flow mode (mirrors AudioPlayer auto-hide)
  const [headerVisible, setHeaderVisible] = useState(true);
  const headerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldAutoHideHeader = layoutMode === 'focused-flow';

  const resetHeaderTimer = useCallback(() => {
    setHeaderVisible(true);
    if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current);
    if (shouldAutoHideHeader) {
      headerTimeoutRef.current = setTimeout(() => setHeaderVisible(false), 3000);
    }
  }, [shouldAutoHideHeader]);

  useEffect(() => {
    if (shouldAutoHideHeader) {
      resetHeaderTimer();
    } else {
      setHeaderVisible(true);
      if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current);
    }
    return () => { if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current); };
  }, [shouldAutoHideHeader]);

  useEffect(() => {
    if (!shouldAutoHideHeader) return;
    const handleInteraction = () => resetHeaderTimer();
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('click', handleInteraction);
    window.addEventListener('mousemove', handleInteraction);
    return () => {
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('mousemove', handleInteraction);
    };
  }, [shouldAutoHideHeader, resetHeaderTimer]);
  
  // Surah dropdown state
  const [surahDropdownOpen, setSurahDropdownOpen] = useState(false);
  const surahDropdownRef = useRef<HTMLDivElement>(null);
  const surahListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (surahDropdownOpen && surahListRef.current) {
      const currentItem = surahListRef.current.querySelector(`[data-surah-id="${chapterId}"]`) as HTMLElement;
      if (currentItem) {
        currentItem.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    }
  }, [surahDropdownOpen, chapterId]);

  useEffect(() => {
    if (!surahDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (surahDropdownRef.current && !surahDropdownRef.current.contains(e.target as Node)) {
        setSurahDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [surahDropdownOpen]);

  // State for managing menu navigation
  const [menuView, setMenuView] = useState<'main' | 'display' | 'reciter' | 'arabic' | 'translation' | 'transliteration' | 'spacing' | 'script'>('main');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Ref to hold pauseAudio so startPreview can access it regardless of hook ordering
  const pauseAudioRef = useRef<() => void>(() => {});

  // Reciter preview state
  const [previewingReciter, setPreviewingReciter] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<number | null>(null);

  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPreview = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
    }
    if (previewTimerRef.current) {
      cancelAnimationFrame(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    setPreviewingReciter(null);
    setPreviewProgress(0);
    setPreviewLoading(false);
  }, []);

  const startPreview = useCallback((reciterId: string) => {
    stopPreview();
    setPreviewError(null);
    pauseAudioRef.current();

    const reciterData = getReciterById(reciterId);
    if (!reciterData) return;

    setPreviewingReciter(reciterId);
    setPreviewLoading(true);

    const audio = new Audio(`/api/verse-audio/${reciterData.everyAyahFolder}/001/002`);
    previewAudioRef.current = audio;

    const showError = () => {
      setPreviewError("Preview unavailable offline");
      stopPreview();
      setTimeout(() => setPreviewError(null), 2500);
    };

    previewTimeoutRef.current = setTimeout(() => {
      if (previewAudioRef.current === audio && audio.paused) {
        showError();
      }
    }, 10000);

    audio.addEventListener('canplay', () => {
      setPreviewLoading(false);
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
      audio.play().catch(() => showError());
    }, { once: true });

    audio.addEventListener('error', () => showError(), { once: true });

    audio.addEventListener('ended', () => stopPreview(), { once: true });

    const updateProgress = () => {
      if (audio && audio.duration && !audio.paused) {
        setPreviewProgress(audio.currentTime / audio.duration);
        previewTimerRef.current = requestAnimationFrame(updateProgress);
      }
    };
    audio.addEventListener('play', () => {
      previewTimerRef.current = requestAnimationFrame(updateProgress);
    });

    audio.load();
  }, [stopPreview]);

  useEffect(() => {
    if (!isMenuOpen || menuView !== 'reciter') {
      stopPreview();
    }
  }, [isMenuOpen, menuView, stopPreview]);

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = '';
      }
      if (previewTimerRef.current) {
        cancelAnimationFrame(previewTimerRef.current);
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);
  
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
    
    if (!initialVerse && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

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
    getTimingData,
    retry: retryAudio,
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
            
            const scrollBehavior = didSeekRef.current ? 'instant' : 'smooth';
            didSeekRef.current = false;
            markProgrammaticScroll();
            container.scrollTo({ 
              top: Math.max(0, targetScroll),
              behavior: scrollBehavior as ScrollBehavior,
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

  pauseAudioRef.current = pauseAudio;

  const reciterDisplayName = getReciterById(reciter)?.name || 'Mishary Rashid Alafasy';
  useMediaSession({
    title: `${chapterInfo?.englishName || 'Quran'} (1-${chapterInfo?.verseCount || '?'})`,
    artist: reciterDisplayName,
    album: 'Tanzeel',
    isPlaying,
    currentTime,
    duration,
    speed,
    onPlay: playAudio,
    onPause: pauseAudio,
    onSeek: seek,
  });

  
  // Track reading time
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        addReadingTime(1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  // Track verse-level reading position during scrolling
  const lastTrackedVerseRef = useRef<number>(0);
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingVerses || verses.length === 0) return;

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const containerRect = container.getBoundingClientRect();
        const viewportMid = containerRect.top + containerRect.height * 0.4;
        let closestVerse = 0;
        let closestDist = Infinity;

        for (let i = 1; i <= verses.length; i++) {
          const el = document.querySelector(`[data-testid="card-verse-${i}"]`) as HTMLElement | null;
          if (el) {
            const rect = el.getBoundingClientRect();
            const dist = Math.abs(rect.top - viewportMid);
            if (dist < closestDist) {
              closestDist = dist;
              closestVerse = i;
            }
          }
        }

        if (closestVerse > 0 && closestVerse !== lastTrackedVerseRef.current) {
          lastTrackedVerseRef.current = closestVerse;
          const verseKey = `${chapterId}:${closestVerse}`;
          incrementVersesRead(0, verseKey);
        }
      }, 500);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [chapterId, isLoadingVerses, verses.length]);

  // Reset completed verses when chapter changes
  useEffect(() => {
    completedVersesRef.current.clear();
  }, [chapterId]);

  const initialVerseHandledRef = useRef(false);

  useEffect(() => {
    if (!initialVerse || initialVerse <= 1 || initialVerseHandledRef.current) return;
    if (isLoadingVerses || verses.length === 0) return;

    initialVerseHandledRef.current = true;

    requestAnimationFrame(() => {
      const verseElement = document.querySelector(`[data-testid="card-verse-${initialVerse}"]`);
      const container = scrollContainerRef.current;
      if (verseElement && container) {
        const headerHeight = 60;
        const verseRect = verseElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const scrollOffset = verseRect.top - containerRect.top + container.scrollTop - headerHeight;
        container.scrollTo({ top: scrollOffset, behavior: 'instant' });
      }

      const verseKey = `${chapterId}:${initialVerse}`;
      seekToVerse(verseKey);
      playAudio();
    });
  }, [initialVerse, isLoadingVerses, verses, chapterId, seekToVerse, playAudio]);

  // Extract current verse number from verse key
  const currentVerse = currentVerseKey ? parseInt(currentVerseKey.split(':')[1]) : 1;

  useEffect(() => {
    const handleUserScroll = () => {
      if (Date.now() < programmaticScrollUntilRef.current) return;
      userScrollingRef.current = true;
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
      userScrollTimeoutRef.current = setTimeout(() => {
        userScrollingRef.current = false;
      }, 4000);
    };

    const containers: HTMLElement[] = [];
    if (scrollContainerRef.current) containers.push(scrollContainerRef.current);
    document.querySelectorAll('.mushaf-page, [class*="overflow-y-auto"][class*="flex-1"]').forEach(el => {
      if (!containers.includes(el as HTMLElement)) containers.push(el as HTMLElement);
    });

    containers.forEach(c => c.addEventListener('scroll', handleUserScroll, { passive: true }));
    return () => {
      containers.forEach(c => c.removeEventListener('scroll', handleUserScroll));
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    };
  }, [layoutMode]);

  useEffect(() => {
    if (!isPlaying || currentWordIndex === null || !autoScroll || userScrollingRef.current) return;

    const wordEl = document.getElementById(`word-${chapterId}-${currentVerse}-${currentWordIndex}`);
    if (!wordEl) return;

    let container = scrollContainerRef.current;
    if (!container || !container.contains(wordEl)) {
      let el: HTMLElement | null = wordEl.parentElement;
      while (el) {
        const style = getComputedStyle(el);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
          container = el as HTMLDivElement;
          break;
        }
        el = el.parentElement;
      }
    }
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const wordRect = wordEl.getBoundingClientRect();

    const headerElement = document.querySelector('.header-safe-padding');
    const headerH = headerElement ? headerElement.getBoundingClientRect().height : 70;
    const playerEl = document.querySelector('[data-testid="audio-player-wrapper"]') as HTMLElement | null;
    const playerH = playerEl ? playerEl.getBoundingClientRect().height : 220;

    const visibleTop = containerRect.top + headerH;
    const visibleBottom = containerRect.bottom - playerH;

    if (wordRect.top < visibleTop || wordRect.bottom > visibleBottom) {
      const targetY = visibleTop + (visibleBottom - visibleTop) * 0.35;
      const scrollDelta = wordRect.top - targetY;

      markProgrammaticScroll();
      container.scrollBy({ top: scrollDelta, behavior: 'smooth' });
    }
  }, [currentWordIndex, currentVerse, isPlaying, chapterId, autoScroll, markProgrammaticScroll]);

  // Navigation functions for next/previous surah
  const goToNextSurah = useCallback(() => {
    const nextChapterId = chapterId + 1;
    if (nextChapterId <= 114) {
      triggerHaptic('medium');
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
      triggerHaptic('medium');
      onNavigate('chapter', prevChapterId);
    }
  }, [chapterId, onNavigate]);

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [swipeIndicator, setSwipeIndicator] = useState<{ direction: 'left' | 'right'; visible: boolean } | null>(null);
  const swipeIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextChapterInfo = chapterId < 114 ? chapters.find(ch => ch.id === chapterId + 1) : null;
  const prevChapterInfo = chapterId > 1 ? chapters.find(ch => ch.id === chapterId - 1) : null;

  const handleSwipeTouchStart = useCallback((e: React.TouchEvent) => {
    if (layoutMode === 'mushaf') return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, [layoutMode]);

  const handleSwipeTouchEnd = useCallback((e: React.TouchEvent) => {
    if (layoutMode === 'mushaf' || !touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    const MIN_SWIPE_DISTANCE = 75;
    const MAX_VERTICAL_TOLERANCE = 100;
    const MAX_SWIPE_TIME = 600;

    if (Math.abs(deltaX) >= MIN_SWIPE_DISTANCE && Math.abs(deltaY) <= MAX_VERTICAL_TOLERANCE && elapsed <= MAX_SWIPE_TIME) {
      if (deltaX < 0 && chapterId < 114) {
        setSwipeIndicator({ direction: 'left', visible: true });
        if (swipeIndicatorTimeoutRef.current) clearTimeout(swipeIndicatorTimeoutRef.current);
        swipeIndicatorTimeoutRef.current = setTimeout(() => {
          setSwipeIndicator(null);
          goToNextSurah();
        }, 400);
      } else if (deltaX > 0 && chapterId > 1) {
        setSwipeIndicator({ direction: 'right', visible: true });
        if (swipeIndicatorTimeoutRef.current) clearTimeout(swipeIndicatorTimeoutRef.current);
        swipeIndicatorTimeoutRef.current = setTimeout(() => {
          setSwipeIndicator(null);
          goToPreviousSurah();
        }, 400);
      }
    }
  }, [layoutMode, chapterId, goToNextSurah, goToPreviousSurah]);

  useEffect(() => {
    return () => {
      if (swipeIndicatorTimeoutRef.current) clearTimeout(swipeIndicatorTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative flex flex-col h-full overflow-hidden bg-gradient-to-b from-background via-background/95 to-background"
      onTouchStart={handleSwipeTouchStart}
      onTouchEnd={handleSwipeTouchEnd}
    >
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
      {/* Opaque safe-area cover so content never bleeds into the Dynamic Island / status bar */}
      <div className={`fixed top-0 left-0 right-0 z-[51] bg-background pointer-events-none transition-opacity duration-300 ${shouldAutoHideHeader && !headerVisible ? 'opacity-0' : 'opacity-100'}`} style={{ height: 'env(safe-area-inset-top, 0px)' }} />

      {/* Gradient Fade Header */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 header-safe-padding transition-all duration-300 ${
          shouldAutoHideHeader
            ? (headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none')
            : (isCollapsed && layoutMode === 'standard' ? 'header-collapsed' : 'header-expanded')
        } ${!shouldAutoHideHeader ? 'header-transition' : ''}`}
        style={{ willChange: 'transform' }}
      >
        <header
          className="w-full"
          style={{
            background: 'linear-gradient(to bottom, var(--header-gradient-start) 0%, var(--header-gradient-mid) 50%, transparent 100%)',
            paddingBottom: '32px',
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

            {/* Center: Surah name + Arabic subtitle — tappable dropdown */}
            <div className="flex flex-col items-center flex-1 mx-3 min-w-0 relative" ref={surahDropdownRef}>
              <button
                className="flex flex-col items-center gap-0 active:opacity-60 transition-opacity"
                onClick={() => setSurahDropdownOpen(prev => !prev)}
                aria-label="Select surah"
                data-testid="button-surah-dropdown"
              >
                <div className="flex items-center gap-1">
                  <h1 className="text-[15px] font-semibold text-foreground/90 dark:text-white/95 tracking-tight truncate" data-testid="text-chapter-title-english">
                    {chapterId}. {chapterInfo?.englishName || 'Al-Fatihah'}
                  </h1>
                  <ChevronDown className={`w-3.5 h-3.5 text-foreground/50 dark:text-white/50 transition-transform duration-200 shrink-0 ${surahDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
                <p className="font-arabic text-muted-foreground dark:text-white/50 truncate text-[18px]" data-testid="text-surah-arabic-name">
                  {chapterInfo ? getDisplayArabicName(chapterInfo.arabicName) : ''}
                </p>
              </button>

              {surahDropdownOpen && (
                <div
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[280px] max-h-[320px] rounded-xl overflow-hidden shadow-2xl border border-border/20 dark:border-white/10"
                  style={{ backgroundColor: 'hsl(var(--sheet-bg) / 0.97)', backdropFilter: 'blur(40px) saturate(180%)' }}
                >
                  <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent dark:from-indigo-900/20 dark:via-slate-900/30 dark:to-transparent" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
                  </div>
                  <div ref={surahListRef} className="overflow-y-auto max-h-[320px] py-1.5 relative z-10">
                    {chapters.map((ch) => {
                      const isCurrent = ch.id === chapterId;
                      return (
                        <button
                          key={ch.id}
                          data-surah-id={ch.id}
                          onClick={() => {
                            setSurahDropdownOpen(false);
                            if (ch.id !== chapterId) {
                              onNavigate('chapter', ch.id);
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                            isCurrent
                              ? 'bg-primary/15 dark:bg-primary/20'
                              : 'hover-elevate'
                          }`}
                          data-testid={`surah-dropdown-item-${ch.id}`}
                        >
                          <span className={`text-xs tabular-nums w-7 text-right shrink-0 ${
                            isCurrent ? 'text-primary font-bold' : 'text-muted-foreground'
                          }`}>
                            {ch.id}
                          </span>
                          <span className={`text-sm truncate flex-1 text-left ${
                            isCurrent ? 'text-primary font-semibold' : 'text-foreground/90 dark:text-white/85'
                          }`}>
                            {ch.englishName}
                          </span>
                          <span className={`font-arabic text-[15px] shrink-0 ${
                            isCurrent ? 'text-primary' : 'text-muted-foreground dark:text-white/40'
                          }`}>
                            {getDisplayArabicName(ch.arabicName)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
            <SheetContent side="bottom" className="h-[73vh] flex flex-col overflow-hidden" style={{ backgroundColor: 'hsl(var(--sheet-bg))', borderColor: 'hsl(var(--sheet-muted))' }}>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent dark:from-indigo-900/20 dark:via-slate-900/30 dark:to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent dark:from-amber-500/8" />
              </div>
              {menuView !== 'main' && (
                <button className="absolute left-4 top-4 z-50 rounded-full size-10 flex items-center justify-center bg-muted/60 dark:bg-slate-800/60 ring-1 ring-border shadow-md transition-opacity opacity-80 hover:opacity-100 active:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setMenuView('main')} data-testid="button-sheet-back">
                  <ChevronLeft className="h-5 w-5 text-foreground" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} />
                </button>
              )}
              <SheetHeader className="mb-4 shrink-0 relative z-10">
                <SheetTitle className="text-xl text-foreground">
                  {menuView === 'main' && 'Options'}
                  {menuView === 'reciter' && 'Select Reciter'}
                </SheetTitle>
              </SheetHeader>

              {menuView === 'main' && (
                <div className="shrink-0 px-4 pb-3 relative z-10" data-testid="options-live-preview">
                  <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'hsl(var(--sheet-muted) / 0.5)', borderBottom: '1px solid hsl(var(--sheet-muted))' }}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-2">Preview</p>
                    <div className={`transition-all duration-200 ${
                      lineSpacing === "Compact" ? "space-y-1" :
                      lineSpacing === "Normal" ? "space-y-2" :
                      lineSpacing === "Relaxed" ? "space-y-3" :
                      "space-y-4"
                    }`}>
                      {showVerseNumbers && (
                        <span
                          className="inline-block text-xs font-semibold tabular-nums text-muted-foreground/70 transition-all duration-200"
                          data-testid="preview-verse-number"
                        >
                          1:1
                        </span>
                      )}
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

              <div className="overflow-y-auto overflow-x-hidden flex-1 pb-16 relative z-10 px-4">
                {menuView === 'main' && (
                  <div className="space-y-7">
                    {/* Text Size Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-text-size">
                        Text Size
                      </h3>
                      <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: 'hsl(var(--sheet-muted) / 0.4)', border: '1px solid hsl(var(--sheet-muted))' }}>
                        <div className="flex items-center justify-between gap-3 py-3">
                          <span className="text-sm text-foreground/80 shrink-0">Arabic</span>
                          <div className="flex gap-1.5 overflow-x-auto flex-nowrap">
                            {[{ label: "S", value: "Small" }, { label: "M", value: "Medium" }, { label: "L", value: "Large" }, { label: "XL", value: "Extra Large" }].map((s) => (
                              <button
                                key={s.value}
                                onClick={() => onArabicFontSizeChange?.(s.value)}
                                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                                  arabicFontSize === s.value
                                    ? 'bg-primary/20 ring-1 ring-primary text-primary'
                                    : 'text-muted-foreground'
                                }`}
                                style={arabicFontSize !== s.value ? { backgroundColor: 'hsl(var(--sheet-muted))' } : undefined}
                                data-testid={`button-arabic-size-${s.value.toLowerCase().replace(' ', '-')}`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
                        <div className="flex items-center justify-between gap-3 py-3">
                          <span className="text-sm text-foreground/80 shrink-0">Translation</span>
                          <div className="flex gap-1.5 overflow-x-auto flex-nowrap">
                            {[{ label: "S", value: "Small" }, { label: "M", value: "Medium" }, { label: "L", value: "Large" }].map((s) => (
                              <button
                                key={s.value}
                                onClick={() => onTranslationFontSizeChange?.(s.value)}
                                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                  translationFontSize === s.value
                                    ? 'bg-primary/20 ring-1 ring-primary text-primary'
                                    : 'text-muted-foreground'
                                }`}
                                style={translationFontSize !== s.value ? { backgroundColor: 'hsl(var(--sheet-muted))' } : undefined}
                                data-testid={`button-translation-size-${s.value.toLowerCase()}`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
                        <div className="flex items-center justify-between gap-3 py-3">
                          <span className="text-sm text-foreground/80 shrink-0">Transliteration</span>
                          <div className="flex gap-1.5 overflow-x-auto flex-nowrap">
                            {[{ label: "S", value: "Small" }, { label: "M", value: "Medium" }, { label: "L", value: "Large" }].map((s) => (
                              <button
                                key={s.value}
                                onClick={() => onTransliterationFontSizeChange?.(s.value)}
                                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                  transliterationFontSize === s.value
                                    ? 'bg-primary/20 ring-1 ring-primary text-primary'
                                    : 'text-muted-foreground'
                                }`}
                                style={transliterationFontSize !== s.value ? { backgroundColor: 'hsl(var(--sheet-muted))' } : undefined}
                                data-testid={`button-transliteration-size-${s.value.toLowerCase()}`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Appearance Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-appearance">
                        Appearance
                      </h3>
                      <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: 'hsl(var(--sheet-muted) / 0.4)', border: '1px solid hsl(var(--sheet-muted))' }}>
                        <div className="flex items-center justify-between gap-3 py-3">
                          <span className="text-sm text-foreground/80 shrink-0">Arabic Script</span>
                          <div className="flex gap-1.5 overflow-x-auto flex-nowrap">
                            {([
                              { value: 'uthmani', label: 'Uthmani' },
                              { value: 'indopak', label: 'IndoPak' },
                              { value: 'tajweed', label: 'Tajweed' },
                            ] as const).map((option) => (
                              <button
                                key={option.value}
                                onClick={() => onArabicScriptChange?.(option.value)}
                                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                  arabicScript === option.value
                                    ? 'bg-primary/20 ring-1 ring-primary text-primary'
                                    : 'text-muted-foreground'
                                }`}
                                style={arabicScript !== option.value ? { backgroundColor: 'hsl(var(--sheet-muted))' } : undefined}
                                data-testid={`button-script-${option.value}`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
                        <div className="flex items-center justify-between gap-3 py-3">
                          <span className="text-sm text-foreground/80 shrink-0">Line Spacing</span>
                          <div className="flex gap-1.5 overflow-x-auto flex-nowrap">
                            {["Compact", "Normal", "Relaxed", "Loose"].map((spacing) => (
                              <button
                                key={spacing}
                                onClick={() => onLineSpacingChange?.(spacing)}
                                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                                  lineSpacing === spacing
                                    ? 'bg-primary/20 ring-1 ring-primary text-primary'
                                    : 'text-muted-foreground'
                                }`}
                                style={lineSpacing !== spacing ? { backgroundColor: 'hsl(var(--sheet-muted))' } : undefined}
                                data-testid={`button-spacing-${spacing.toLowerCase()}`}
                              >
                                {spacing}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Audio Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-audio">
                        Audio
                      </h3>
                      <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: 'hsl(var(--sheet-muted) / 0.4)', border: '1px solid hsl(var(--sheet-muted))' }}>
                        <button
                          onClick={() => setMenuView('reciter')}
                          className="w-full flex items-center justify-between py-3 hover-elevate active-elevate-2 rounded-md"
                          data-testid="menu-item-reciter"
                        >
                          <span className="text-sm text-foreground/80">Reciter</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{getReciterById(reciter)?.name || 'Mishary Alafasy'}</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </button>
                        <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
                        <div className="flex items-center justify-between py-3" data-testid="menu-item-autoplay">
                          <span className="text-sm text-foreground/80">Autoplay next surah</span>
                          <Switch 
                            checked={autoplay} 
                            onCheckedChange={(v) => { onAutoplayChange(v); }}
                            data-testid="switch-autoplay"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Display Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-display">
                        Display
                      </h3>
                      <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: 'hsl(var(--sheet-muted) / 0.4)', border: '1px solid hsl(var(--sheet-muted))' }}>
                        <div className="flex items-center justify-between py-3" data-testid="menu-item-theme">
                          <span className="text-sm text-foreground/80">Theme</span>
                          <ThemeToggle isDark={darkMode} onToggle={(v) => { onDarkModeChange(v); }} />
                        </div>
                        <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
                        <div className="flex items-center justify-between py-3" data-testid="menu-item-transliteration">
                          <span className="text-sm text-foreground/80">Transliteration</span>
                          <Switch 
                            checked={showTransliteration} 
                            onCheckedChange={(v) => { onTransliterationChange(v); }}
                            data-testid="switch-transliteration"
                          />
                        </div>
                        <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
                        <div className="flex items-center justify-between py-3" data-testid="menu-item-translation">
                          <span className="text-sm text-foreground/80">Translation</span>
                          <Switch 
                            checked={showTranslation} 
                            onCheckedChange={(v) => { onShowTranslationChange(v); }}
                            data-testid="switch-translation"
                          />
                        </div>
                        <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
                        <div className="flex items-center justify-between py-3" data-testid="menu-item-verse-numbers">
                          <span className="text-sm text-foreground/80">Verse numbers</span>
                          <Switch 
                            checked={showVerseNumbers} 
                            onCheckedChange={(v) => { onShowVerseNumbersChange?.(v); }}
                            data-testid="switch-verse-numbers"
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                )}


                {menuView === 'reciter' && (
                  <div className="space-y-1">
                    {getFeaturedReciters().map((r) => {
                      const isSelected = reciter === r.id;
                      const isPreviewing = previewingReciter === r.id;
                      const isLoadingPreview = isPreviewing && previewLoading;

                      return (
                        <div
                          key={r.id}
                          className="flex items-center gap-2 rounded-md"
                          data-testid={`reciter-option-${r.id}`}
                        >
                          <button
                            onClick={() => {
                              onReciterChange(r.id);
                              setMenuView('main');
                            }}
                            className="flex-1 flex items-center gap-2 p-4 hover-elevate active-elevate-2 rounded-md min-w-0"
                            data-testid={`reciter-select-${r.id}`}
                          >
                            <div className="flex flex-col items-start min-w-0 flex-1">
                              <span className="text-base text-foreground/90 flex items-center gap-2 flex-wrap">
                                <span className="truncate">{r.name}{r.style ? ` (${r.style})` : ''}</span>
                                {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                              </span>
                              <span className="text-sm text-muted-foreground">{r.arabicName}</span>
                            </div>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPreviewing && !isLoadingPreview) {
                                stopPreview();
                              } else {
                                startPreview(r.id);
                              }
                            }}
                            className="relative flex items-center justify-center size-10 shrink-0 mr-2 rounded-full"
                            aria-label={isPreviewing ? `Stop preview for ${r.name}` : `Preview ${r.name}`}
                            data-testid={`reciter-preview-${r.id}`}
                          >
                            {isPreviewing && !isLoadingPreview && (
                              <svg className="absolute inset-0 w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                                <circle cx="20" cy="20" r="17" fill="none" stroke="hsl(var(--sheet-muted))" strokeWidth="2.5" />
                                <circle
                                  cx="20" cy="20" r="17"
                                  fill="none"
                                  stroke="hsl(var(--primary))"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeDasharray={`${2 * Math.PI * 17}`}
                                  strokeDashoffset={`${2 * Math.PI * 17 * (1 - previewProgress)}`}
                                  style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                                />
                              </svg>
                            )}
                            {isLoadingPreview ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : isPreviewing ? (
                              <Pause className="w-4 h-4 text-primary" />
                            ) : (
                              <Play className="w-4 h-4 text-muted-foreground ml-0.5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                    {previewError && (
                      <div className="text-center py-2">
                        <span className="text-xs text-red-400">{previewError}</span>
                      </div>
                    )}
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
          className="relative flex-1 overflow-y-auto px-6 pb-[260px] transition-[padding] duration-300"
          style={{ paddingTop: isCollapsed ? 'calc(80px + env(safe-area-inset-top, 0px))' : 'calc(100px + env(safe-area-inset-top, 0px))' }}
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

      {swipeIndicator && (
        <div
          className={`fixed z-[60] top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-3 rounded-xl bg-foreground/80 dark:bg-white/80 text-background dark:text-black shadow-lg backdrop-blur-sm transition-all duration-300 ${
            swipeIndicator.direction === 'left'
              ? 'right-4 animate-in slide-in-from-right-4'
              : 'left-4 animate-in slide-in-from-left-4'
          }`}
          data-testid={`swipe-indicator-${swipeIndicator.direction}`}
        >
          {swipeIndicator.direction === 'right' && prevChapterInfo && (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-medium">{prevChapterInfo.englishName}</span>
            </>
          )}
          {swipeIndicator.direction === 'left' && nextChapterInfo && (
            <>
              <span className="text-sm font-medium">{nextChapterInfo.englishName}</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </div>
      )}

      <AudioPlayer
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        speed={speed}
        isLoading={isLoading}
        repeat={repeat}
        error={error}
        onRetry={retryAudio}
        onPlayPause={togglePlayPause}
        onSeek={(time) => { didSeekRef.current = true; seek(time); }}
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
        verseTimings={getTimingData()?.verse_timings}
      />
    </div>
  );
}
