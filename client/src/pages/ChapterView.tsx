import { useState, useEffect } from "react";
import { ArrowLeft, Bookmark } from "lucide-react";
import VerseCard from "@/components/VerseCard";
import AudioPlayer from "@/components/AudioPlayer";
import { getChapterVerses, getChapterInfo } from "@/lib/quranData";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { getChapterAudioUrl, getVerseTimestamps, PREAMBLE_TEXT } from "@/lib/verseTimestamps";
import { getChapterBookmark, isBookmarked, saveBookmark, removeBookmark } from "@/lib/bookmarks";

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
  onAutoScrollChange: (enabled: boolean) => void;
  onRepeatChange: (enabled: boolean) => void;
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
  onAutoScrollChange,
  onRepeatChange
}: ChapterViewProps) {
  const chapterInfo = getChapterInfo(chapterId);
  const verses = getChapterVerses(chapterId);
  const audioUrl = getChapterAudioUrl(chapterId, reciter);
  const verseTimestamps = getVerseTimestamps(chapterId);
  
  // Initialize bookmark state from localStorage
  const [bookmarkedVerse, setBookmarkedVerse] = useState<number | null>(
    () => getChapterBookmark(chapterId)
  );

  // Update bookmark when chapter changes
  useEffect(() => {
    const saved = getChapterBookmark(chapterId);
    setBookmarkedVerse(saved);
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
  } = useAudioPlayer(audioUrl, verseTimestamps, (verse) => {
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
  }, repeat);

  // Update speed when settings change
  useEffect(() => {
    const speedMap: { [key: string]: number } = {
      'Slow': 0.75,
      'Normal': 1.0,
      'Fast': 1.25,
    };
    setSpeed(speedMap[initialSpeed] || 1.0);
  }, [initialSpeed, setSpeed]);

  const cycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 1.75, 2.0];
    const currentIndex = speeds.indexOf(speed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setSpeed(nextSpeed);
  };

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

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button 
            className="p-2 hover-elevate active-elevate-2 rounded-md"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground" data-testid="text-chapter-title">
            {chapterInfo?.arabicName || 'Al-Fatihah'}
          </h1>
          <button 
            className="p-2 hover-elevate active-elevate-2 rounded-md" 
            onClick={toggleBookmark}
            data-testid="button-bookmark"
          >
            <Bookmark className={`w-6 h-6 ${hasChapterBookmark ? 'fill-primary text-primary' : 'text-foreground'}`} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-border">
          {/* Display preamble (A'udhu billahi) if chapter audio includes it */}
          {verseTimestamps.some(v => v.verse === 0) && (
            <VerseCard
              key={0}
              verseNumber={0}
              arabicText={PREAMBLE_TEXT.arabic}
              transliteration={PREAMBLE_TEXT.transliteration}
              translation={PREAMBLE_TEXT.translation}
              showTransliteration={showTransliteration}
              showTranslation={showTranslation}
              isPlaying={isPlaying && isInVerseRange && currentVerse === 0}
              onClick={() => handleVerseClick(0)}
            />
          )}
          
          {verses.map((verse) => (
            <VerseCard
              key={verse.number}
              verseNumber={verse.number}
              arabicText={verse.arabicText}
              transliteration={verse.transliteration}
              translation={verse.translation}
              showTransliteration={showTransliteration}
              showTranslation={showTranslation}
              isPlaying={isPlaying && isInVerseRange && currentVerse === verse.number}
              onClick={() => handleVerseClick(verse.number)}
            />
          ))}
        </div>
        <div className="h-40" />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10">
        <AudioPlayer
          currentTime={currentTime}
          duration={duration || 0}
          isPlaying={isPlaying}
          speed={speed}
          isLoading={isLoading}
          autoScroll={autoScroll}
          repeat={repeat}
          onPlayPause={togglePlayPause}
          onSeek={seek}
          onSpeedChange={cycleSpeed}
          onPrevious={previousVerse}
          onNext={nextVerse}
          onAutoScrollChange={onAutoScrollChange}
          onRepeatChange={onRepeatChange}
        />
      </div>
    </div>
  );
}
