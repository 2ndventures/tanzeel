import { useState } from "react";
import { ArrowLeft, Bookmark } from "lucide-react";
import VerseCard from "@/components/VerseCard";
import AudioPlayer from "@/components/AudioPlayer";
import BottomNav from "@/components/BottomNav";
import { alFatihahVerses } from "@/lib/quranData";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChapterViewProps {
  chapterId: number;
  onBack: () => void;
  showTransliteration: boolean;
  onNavigate: (page: string, chapterId?: number) => void;
}

export default function ChapterView({ chapterId, onBack, showTransliteration, onNavigate }: ChapterViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(83);
  const [speed, setSpeed] = useState(1.0);
  const [currentVerse, setCurrentVerse] = useState(3);

  // Simulate verse progression based on time (for demo)
  // In real app, this would sync with actual audio timestamps
  const getVerseFromTime = (time: number) => {
    if (time < 20) return 1;
    if (time < 45) return 2;
    if (time < 70) return 3;
    if (time < 95) return 4;
    if (time < 130) return 5;
    if (time < 160) return 6;
    return 7;
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
          <button className="p-2 hover-elevate active-elevate-2 rounded-md" data-testid="button-bookmark">
            <Bookmark className="w-6 h-6 text-foreground" />
          </button>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {alFatihahVerses.map((verse) => (
            <VerseCard
              key={verse.number}
              verseNumber={verse.number}
              arabicText={verse.arabicText}
              transliteration={verse.transliteration}
              translation={verse.translation}
              showTransliteration={showTransliteration}
              isPlaying={isPlaying && getVerseFromTime(currentTime) === verse.number}
            />
          ))}
        </div>
        <div className="h-40" />
      </ScrollArea>

      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 pointer-events-none">
        <div className="pointer-events-auto max-w-md mx-auto">
          <AudioPlayer
            currentTime={currentTime}
            duration={205}
            isPlaying={isPlaying}
            speed={speed}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onSeek={setCurrentTime}
            onSpeedChange={() => {
              const newSpeed = speed === 1.0 ? 1.5 : speed === 1.5 ? 2.0 : 1.0;
              setSpeed(newSpeed);
            }}
            onPrevious={() => console.log('Previous verse')}
            onNext={() => console.log('Next verse')}
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
