import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Bookmark } from "lucide-react";
import VerseCard from "@/components/VerseCard";
import AudioPlayer from "@/components/AudioPlayer";
import BottomNav from "@/components/BottomNav";
import { alFatihahVerses } from "@/lib/quranData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { getChapterAudioUrl, getVerseTimestamps } from "@/lib/verseTimestamps";

interface ChapterViewProps {
  chapterId: number;
  onBack: () => void;
  showTransliteration: boolean;
  onNavigate: (page: string, chapterId?: number) => void;
  reciter: string;
  speed: string;
  autoScroll: boolean;
  repeat: boolean;
}

export default function ChapterView({ 
  chapterId, 
  onBack, 
  showTransliteration, 
  onNavigate,
  reciter,
  speed: initialSpeed,
  autoScroll,
  repeat
}: ChapterViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [bookmarked, setBookmarked] = useState(false);
  
  const audioUrl = getChapterAudioUrl(chapterId, reciter);
  const verseTimestamps = getVerseTimestamps(chapterId);
  
  const {
    isPlaying,
    currentTime,
    duration,
    speed,
    currentVerse,
    isLoading,
    togglePlayPause,
    seek,
    setSpeed,
    nextVerse,
    previousVerse,
  } = useAudioPlayer(audioUrl, verseTimestamps, (verse) => {
    if (autoScroll && scrollRef.current) {
      const verseElement = document.querySelector(`[data-testid="card-verse-${verse}"]`);
      if (verseElement) {
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

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

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
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
            Al-Fatihah
          </h1>
          <button 
            className="p-2 hover-elevate active-elevate-2 rounded-md" 
            onClick={() => setBookmarked(!bookmarked)}
            data-testid="button-bookmark"
          >
            <Bookmark className={`w-6 h-6 ${bookmarked ? 'fill-primary text-primary' : 'text-foreground'}`} />
          </button>
        </div>
      </header>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="divide-y divide-border">
          {alFatihahVerses.map((verse) => (
            <VerseCard
              key={verse.number}
              verseNumber={verse.number}
              arabicText={verse.arabicText}
              transliteration={verse.transliteration}
              translation={verse.translation}
              showTransliteration={showTransliteration}
              isPlaying={isPlaying && currentVerse === verse.number}
            />
          ))}
        </div>
        <div className="h-40" />
      </ScrollArea>

      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 pointer-events-none">
        <div className="pointer-events-auto max-w-md mx-auto">
          <AudioPlayer
            currentTime={currentTime}
            duration={duration || 0}
            isPlaying={isPlaying}
            speed={speed}
            isLoading={isLoading}
            onPlayPause={togglePlayPause}
            onSeek={seek}
            onSpeedChange={cycleSpeed}
            onPrevious={previousVerse}
            onNext={nextVerse}
          />
        </div>
      </div>

      <BottomNav
        activeTab="surah"
        onTabChange={(tab) => {
          if (tab === "settings") onNavigate("settings");
          if (tab === "home" || tab === "surah") onBack();
        }}
      />
    </div>
  );
}
