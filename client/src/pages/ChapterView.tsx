import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Bookmark, MoreVertical, ChevronRight, Check } from "lucide-react";
import VerseCard from "@/components/VerseCard";
import AudioPlayer from "@/components/AudioPlayer";
import { getChapterVerses, getChapterInfo, getDisplayArabicName } from "@/lib/quranData";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { getChapterBookmark, isBookmarked, saveBookmark, removeBookmark } from "@/lib/bookmarks";
import { getFeaturedReciters, getReciterById } from "@/lib/reciters";
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
  
  // Get reciter info for EveryAyah folder
  const reciterInfo = getReciterById(reciter);
  const everyAyahFolder = reciterInfo?.everyAyahFolder || 'Alafasy_128kbps';
  
  // Generate audio URL for a specific verse
  const getAudioUrl = (verseNum: number) => {
    const surahPadded = String(chapterId).padStart(3, '0');
    const ayahPadded = String(verseNum).padStart(3, '0');
    return `https://everyayah.com/data/${everyAyahFolder}/${surahPadded}${ayahPadded}.mp3`;
  };
  
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
    speed,
    currentVerse,
    isLoading,
    togglePlayPause,
    setSpeed,
    seekToVerse,
    nextVerse: audioNextVerse,
    prevVerse: audioPrevVerse,
  } = useAudioPlayer(
    getAudioUrl,
    verses.length,
    1, // Start at verse 1
    repeat,
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
    () => {
      // Auto-play next surah when current one ends (if autoplay is enabled and not repeating)
      if (autoplay && !repeat) {
        console.log('🎵 Auto-playing next surah after completion of chapter', chapterId);
        goToNextSurah();
      }
    }
  );

  // Update speed when settings change (map string to numeric value)
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
    if (autoplay && !isPlaying && !isLoading && !autoplayTriggeredRef.current) {
      console.log('🎵 Autoplay triggered for chapter', chapterId);
      autoplayTriggeredRef.current = true;
      togglePlayPause();
    }
  }, [autoplay, isPlaying, isLoading, chapterId, togglePlayPause]);

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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 overflow-auto px-4 pt-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {verses.map((verse, index) => {
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
                onClick={() => handleVerseClick(verseNumber)}
              />
            );
          })}
        </div>

        <div className="max-w-2xl mx-auto mt-6 pb-6 flex justify-between items-center">
          <button 
            className="px-4 py-2 text-sm text-primary hover-elevate active-elevate-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={goToPreviousSurah}
            disabled={chapterId === 1}
            data-testid="button-previous-chapter"
          >
            ← Previous Surah
          </button>
          <button 
            className="px-4 py-2 text-sm text-primary hover-elevate active-elevate-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={goToNextSurah}
            disabled={chapterId === 114}
            data-testid="button-next-chapter"
          >
            Next Surah <ChevronRight className="w-4 h-4 inline ml-1" />
          </button>
        </div>
      </main>

      <AudioPlayer
        isPlaying={isPlaying}
        onPlayPause={togglePlayPause}
        onPrevious={audioPrevVerse}
        onNext={audioNextVerse}
        isLoading={isLoading}
      />
    </div>
  );
}
