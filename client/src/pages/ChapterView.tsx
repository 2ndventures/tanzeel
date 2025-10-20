import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Bookmark, MoreVertical, ChevronRight, Check, Bug, Plus, Minus, RotateCcw } from "lucide-react";
import VerseCard from "@/components/VerseCard";
import AudioPlayer from "@/components/AudioPlayer";
import AudioDebugPanel from "@/components/AudioDebugPanel";
import { getChapterVerses, getChapterInfo, getDisplayArabicName } from "@/lib/quranData";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { getChapterAudioUrl, fetchVerseTimestamps, getVerseTimestamps, VerseTimestamp } from "@/lib/verseTimestamps";
import { getChapterBookmark, isBookmarked, saveBookmark, removeBookmark } from "@/lib/bookmarks";
import { getFeaturedReciters, getReciterById } from "@/lib/reciters";
import { getReciterOffset, setReciterOffset, resetReciterOffset } from "@/lib/timingCalibration";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

interface ChapterViewProps {
  chapterId: number;
  onBack: () => void;
  showTransliteration: boolean;
  showTranslation: boolean;
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings") => void;
  reciter: string;
  speed: string;
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
}

export default function ChapterView({ 
  chapterId, 
  onBack, 
  showTransliteration, 
  showTranslation,
  onNavigate,
  reciter,
  speed: initialSpeed,
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
  onReciterChange
}: ChapterViewProps) {
  const chapterInfo = getChapterInfo(chapterId);
  const verses = getChapterVerses(chapterId);
  const audioUrl = getChapterAudioUrl(chapterId, reciter);
  
  // Fetch reciter-specific timestamps
  const [verseTimestamps, setVerseTimestamps] = useState<VerseTimestamp[]>(() => getVerseTimestamps(chapterId));
  const [isLoadingTimestamps, setIsLoadingTimestamps] = useState(false);
  
  // Timing calibration and debug
  const [timingOffsetMs, setTimingOffsetMs] = useState<number>(() => getReciterOffset(reciter));
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Fetch timestamps when reciter or chapter changes
  useEffect(() => {
    const loadTimestamps = async () => {
      const reciterInfo = getReciterById(reciter);
      
      // Load timing offset for this reciter
      const offset = getReciterOffset(reciter);
      setTimingOffsetMs(offset);
      if (offset !== 0) {
        console.log(`⚙️ Loaded timing offset: ${offset}ms for ${reciterInfo?.name}`);
      }
      
      // If reciter has MP3Quran ID, fetch accurate timestamps
      if (reciterInfo?.mp3QuranId) {
        setIsLoadingTimestamps(true);
        console.log(`📡 Fetching timestamps for ${reciterInfo.name} (ID: ${reciterInfo.mp3QuranId}), Chapter ${chapterId}`);
        
        const timestamps = await fetchVerseTimestamps(chapterId, reciterInfo.mp3QuranId);
        setVerseTimestamps(timestamps);
        setIsLoadingTimestamps(false);
        
        console.log(`✓ Loaded ${timestamps.length} verse timestamps for ${reciterInfo.name}`);
      } else {
        // Fallback to approximate timestamps
        console.log(`⚠️ No MP3Quran ID for ${reciterInfo?.name || reciter}, using approximate timestamps`);
        setVerseTimestamps(getVerseTimestamps(chapterId));
      }
    };
    
    loadTimestamps();
  }, [chapterId, reciter]);
  
  // Initialize bookmark state from localStorage
  const [bookmarkedVerse, setBookmarkedVerse] = useState<number | null>(
    () => getChapterBookmark(chapterId)
  );

  // Update bookmark when chapter changes
  useEffect(() => {
    const saved = getChapterBookmark(chapterId);
    setBookmarkedVerse(saved);
  }, [chapterId]);

  // Scroll to top when chapter changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [chapterId]);
  
  const {
    isPlaying,
    currentTime,
    duration,
    speed,
    currentVerse,
    isInVerseRange,
    isLoading,
    togglePlayPause,
    seek,
    setSpeed,
    seekToVerse,
    nextVerse,
    previousVerse,
  } = useAudioPlayer(
    audioUrl, 
    verseTimestamps, 
    (verse) => {
      if (autoScroll) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          const verseElement = document.querySelector(`[data-testid="card-verse-${verse}"]`);
          
          if (verseElement) {
            // Calculate offset from top of viewport
            const rect = verseElement.getBoundingClientRect();
            // Account for the sticky header (60px) to position verse at top below header
            const headerHeight = 60;
            const offset = rect.top - headerHeight;
            
            console.log('📜 Auto-scroll verse', verse, 'offset:', offset);
            
            // Scroll window to bring verse to top (below header)
            window.scrollBy({ top: offset, behavior: 'smooth' });
          }
        });
      }
    }, 
    repeat,
    () => {
      // Auto-play next surah when current one ends (if autoplay is enabled and not repeating)
      if (autoplay && !repeat) {
        console.log('🎵 Auto-playing next surah after completion of chapter', chapterId);
        goToNextSurah();
      }
    },
    timingOffsetMs
  );


  // Update speed when settings change (map string to numeric value)
  // Only run when initialSpeed changes, not when speed changes (to avoid overriding manual speed changes)
  useEffect(() => {
    const speedMap: { [key: string]: number } = {
      'Slow': 0.75,
      'Normal': 1.0,
      'Fast': 1.25,
    };
    const mappedSpeed = speedMap[initialSpeed];
    if (mappedSpeed) {
      console.log('Setting speed from settings:', mappedSpeed);
      setSpeed(mappedSpeed);
    }
  }, [initialSpeed, setSpeed]);

  // Track if autoplay has been triggered for this chapter
  const autoplayTriggeredRef = useRef(false);

  // Reset autoplay trigger when chapter changes
  useEffect(() => {
    autoplayTriggeredRef.current = false;
  }, [chapterId]);

  // Autoplay effect - starts playback when chapter loads if autoplay is enabled
  useEffect(() => {
    if (autoplay && !isPlaying && !isLoading && duration > 0 && !autoplayTriggeredRef.current) {
      console.log('🎵 Autoplay triggered for chapter', chapterId);
      autoplayTriggeredRef.current = true;
      togglePlayPause();
    }
  }, [autoplay, isPlaying, isLoading, duration, chapterId, togglePlayPause]);

  // Show bookmark as filled if there's any bookmark for this chapter
  const hasChapterBookmark = bookmarkedVerse !== null;

  const toggleBookmark = () => {
    const currentIsBookmarked = isBookmarked(chapterId, currentVerse);
    
    // If current verse is bookmarked, remove it
    if (currentIsBookmarked) {
      removeBookmark(chapterId, currentVerse);
      setBookmarkedVerse(null);
    } 
    // If there's a saved bookmark for a different verse, seek to it
    else if (bookmarkedVerse && bookmarkedVerse !== currentVerse) {
      seekToVerse(bookmarkedVerse);
    } 
    // Otherwise, bookmark the current verse
    else {
      saveBookmark(chapterId, currentVerse);
      setBookmarkedVerse(currentVerse);
    }
  };

  const handleVerseClick = (verseNumber: number) => {
    // Seek to the clicked verse and start playback
    seekToVerse(verseNumber);
    if (!isPlaying) {
      togglePlayPause();
    }
  };

  const goToNextSurah = () => {
    const nextChapterId = chapterId + 1;
    if (nextChapterId <= 114) {
      onNavigate('chapter', nextChapterId);
    }
  };

  const goToPreviousSurah = () => {
    const prevChapterId = chapterId - 1;
    if (prevChapterId >= 1) {
      onNavigate('chapter', prevChapterId);
    }
  };

  // Timing calibration functions
  const adjustTimingOffset = (deltaMs: number) => {
    const newOffset = timingOffsetMs + deltaMs;
    console.log(`🎯 Adjusting timing offset: ${timingOffsetMs}ms → ${newOffset}ms`);
    setTimingOffsetMs(newOffset);
    setReciterOffset(reciter, newOffset);
  };

  const resetTimingOffset = () => {
    console.log(`🔄 Resetting timing offset from ${timingOffsetMs}ms to 0ms`);
    setTimingOffsetMs(0);
    resetReciterOffset(reciter);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4 pb-2">
          <button 
            className="p-2 hover-elevate active-elevate-2 rounded-md"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <div className="flex flex-col items-center flex-1 mx-2">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-foreground" data-testid="text-chapter-title-english">
                {chapterInfo?.englishName || 'Al-Fatihah'}
              </h1>
              <h2 className="text-xl font-semibold text-foreground font-arabic" data-testid="text-chapter-title-arabic">
                {chapterInfo ? getDisplayArabicName(chapterInfo.arabicName) : 'ٱلْفَاتِحَةِ'}
              </h2>
            </div>
            {chapterId !== 9 && (
              <p className="text-base font-arabic text-foreground mt-1" data-testid="text-bismillah">
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="p-2 hover-elevate active-elevate-2 rounded-md" 
                data-testid="button-menu"
              >
                <MoreVertical className="w-6 h-6 text-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="flex items-center justify-between cursor-pointer"
                onClick={toggleBookmark}
                data-testid="menu-item-bookmark"
              >
                <span>Bookmark</span>
                <Bookmark className={`w-4 h-4 ${hasChapterBookmark ? 'fill-primary text-primary' : ''}`} />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger data-testid="menu-item-reciter">
                  <span>Reciter</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {getReciterById(reciter)?.name || 'Mishary Alafasy'}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuLabel>Select Reciter</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {getFeaturedReciters().map((r) => (
                    <DropdownMenuItem
                      key={r.id}
                      onClick={() => onReciterChange(r.id)}
                      className="flex items-center justify-between cursor-pointer"
                      data-testid={`reciter-option-${r.id}`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm">{r.name}</span>
                        <span className="text-xs text-muted-foreground">{r.arabicName}</span>
                      </div>
                      {reciter === r.id && <Check className="w-4 h-4 ml-2 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="flex items-center justify-between cursor-pointer"
                onSelect={(e) => e.preventDefault()}
                onClick={() => onDarkModeChange?.(!darkMode)}
                data-testid="menu-item-theme"
              >
                <span>Theme</span>
                <Switch 
                  checked={darkMode} 
                  onCheckedChange={onDarkModeChange}
                  onClick={(e) => e.stopPropagation()}
                  data-testid="switch-theme"
                />
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center justify-between cursor-pointer"
                onSelect={(e) => e.preventDefault()}
                onClick={() => onTransliterationChange?.(!showTransliteration)}
                data-testid="menu-item-transliteration"
              >
                <span>Transliteration</span>
                <Switch 
                  checked={showTransliteration} 
                  onCheckedChange={onTransliterationChange}
                  onClick={(e) => e.stopPropagation()}
                  data-testid="switch-transliteration"
                />
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center justify-between cursor-pointer"
                onSelect={(e) => e.preventDefault()}
                onClick={() => onShowTranslationChange?.(!showTranslation)}
                data-testid="menu-item-translation"
              >
                <span>Translation</span>
                <Switch 
                  checked={showTranslation} 
                  onCheckedChange={onShowTranslationChange}
                  onClick={(e) => e.stopPropagation()}
                  data-testid="switch-translation"
                />
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center justify-between cursor-pointer"
                onSelect={(e) => e.preventDefault()}
                onClick={() => onAutoScrollChange?.(!autoScroll)}
                data-testid="menu-item-auto-scroll"
              >
                <span>Auto-scroll</span>
                <Switch 
                  checked={autoScroll} 
                  onCheckedChange={onAutoScrollChange}
                  onClick={(e) => e.stopPropagation()}
                  data-testid="switch-auto-scroll"
                />
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center justify-between cursor-pointer"
                onSelect={(e) => e.preventDefault()}
                onClick={() => onAutoplayChange?.(!autoplay)}
                data-testid="menu-item-autoplay"
              >
                <span>Autoplay</span>
                <Switch 
                  checked={autoplay} 
                  onCheckedChange={onAutoplayChange}
                  onClick={(e) => e.stopPropagation()}
                  data-testid="switch-autoplay"
                />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                data-testid="menu-item-debug"
              >
                <span>Debug Mode</span>
                <Bug className={`w-4 h-4 ${showDebugPanel ? 'text-primary' : ''}`} />
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger data-testid="menu-item-timing-calibration">
                  <span>Timing Calibration</span>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">
                    {timingOffsetMs > 0 ? '+' : ''}{timingOffsetMs}ms
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuLabel>Adjust Sync Timing</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => { e.preventDefault(); adjustTimingOffset(-100); }}
                    className="flex items-center gap-2 cursor-pointer"
                    data-testid="timing-adjust-minus-100"
                  >
                    <Minus className="w-4 h-4" />
                    <span>Earlier (-100ms)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => { e.preventDefault(); adjustTimingOffset(-50); }}
                    className="flex items-center gap-2 cursor-pointer"
                    data-testid="timing-adjust-minus-50"
                  >
                    <Minus className="w-4 h-4" />
                    <span>Earlier (-50ms)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => { e.preventDefault(); adjustTimingOffset(50); }}
                    className="flex items-center gap-2 cursor-pointer"
                    data-testid="timing-adjust-plus-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Later (+50ms)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => { e.preventDefault(); adjustTimingOffset(100); }}
                    className="flex items-center gap-2 cursor-pointer"
                    data-testid="timing-adjust-plus-100"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Later (+100ms)</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => { e.preventDefault(); resetTimingOffset(); }}
                    className="flex items-center gap-2 cursor-pointer"
                    data-testid="timing-reset"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset to 0ms</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-border">
          {verses.map((verse) => {
            // For Chapter 1 (Al-Fatihah), verse 1 IS the Bismillah
            // Since Bismillah is already in header, skip displaying verse 1 for Chapter 1
            if (chapterId === 1 && verse.number === 1) {
              return null;
            }
            
            // For other chapters (except 9), remove Bismillah prefix from verse 1
            let arabicText = verse.arabicText;
            if (verse.number === 1 && chapterId !== 9 && chapterId !== 1) {
              const BISMILLAH_PREFIX = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
              // Normalize both strings for Unicode comparison (handles different diacritic representations)
              const normalizedText = arabicText.normalize('NFC');
              const normalizedPrefix = BISMILLAH_PREFIX.normalize('NFC');
              
              if (normalizedText.startsWith(normalizedPrefix)) {
                arabicText = normalizedText.slice(normalizedPrefix.length).trim();
              }
            }
            
            return (
              <VerseCard
                key={verse.number}
                chapterId={chapterId}
                verseNumber={verse.number}
                arabicText={arabicText}
                transliteration={verse.transliteration}
                translation={verse.translation}
                showTransliteration={showTransliteration}
                showTranslation={showTranslation}
                isPlaying={isPlaying}
                isCurrentVerse={currentVerse === verse.number}
                isInVerseRange={isInVerseRange}
                onClick={() => handleVerseClick(verse.number)}
              />
            );
          })}
        </div>
        <div className="h-40" />
      </div>

      <AudioPlayer
        currentTime={currentTime}
        duration={duration || 0}
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
      />
      
      {showDebugPanel && (
        <AudioDebugPanel
          currentTime={currentTime}
          currentVerse={currentVerse}
          isInVerseRange={isInVerseRange}
          verseTimestamps={verseTimestamps}
          offsetMs={timingOffsetMs}
          onClose={() => setShowDebugPanel(false)}
        />
      )}
    </div>
  );
}
