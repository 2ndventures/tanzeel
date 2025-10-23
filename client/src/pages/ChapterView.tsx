import { useEffect, useRef, useCallback } from "react";
import { ArrowLeft, MoreVertical, Check, Sun, Moon } from "lucide-react";
import VerseCard from "@/components/VerseCard";
import AudioPlayer from "@/components/AudioPlayer";
import { getChapterVerses, getChapterInfo, getDisplayArabicName } from "@/lib/quranData";
import { useWordTimingAudio } from "@/hooks/useWordTimingAudio";
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
  arabicFontSize: string;
  translationFontSize: string;
  transliterationFontSize: string;
  lineSpacing: string;
  showVerseNumbers: boolean;
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
  onReciterChange,
  arabicFontSize,
  translationFontSize,
  transliterationFontSize,
  lineSpacing,
  showVerseNumbers
}: ChapterViewProps) {
  const chapterInfo = getChapterInfo(chapterId);
  const verses = getChapterVerses(chapterId);
  
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

  // Scroll to top when chapter changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [chapterId]);
  
  // Map speed setting to numeric value
  const speedMap: { [key: string]: number } = {
    'Slow': 0.75,
    'Normal': 1.0,
    'Fast': 1.25,
  };
  const numericSpeed = speedMap[initialSpeed] || 1.0;

  // Use word-timing audio with continuous playback
  const {
    isPlaying,
    speed,
    currentVerseKey,
    currentWordIndex,
    isLoading,
    currentTime,
    duration,
    togglePlayPause,
    seek,
    setSpeed,
    seekToVerse,
  } = useWordTimingAudio(
    chapterId,
    quranComReciterId,
    repeat,
    (verseKey) => {
      if (autoScroll) {
        // Parse verse key (e.g., "1:2" -> verse 2)
        const verseNumber = parseInt(verseKey.split(':')[1]);
        
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          const verseElement = document.querySelector(`[data-testid="card-verse-${verseNumber}"]`);
          
          if (verseElement) {
            // Calculate offset from top of viewport
            const rect = verseElement.getBoundingClientRect();
            // Account for the sticky header (60px) to position verse at top below header
            const headerHeight = 60;
            const offset = rect.top - headerHeight;
            
            console.log('📜 Auto-scroll verse', verseNumber, 'offset:', offset);
            
            // Scroll window to bring verse to top (below header)
            window.scrollBy({ top: offset, behavior: 'smooth' });
          }
        });
      }
    },
    () => {
      // Navigate to next surah when current one ends (autoplay will be handled by hook)
      console.log('✓ Chapter ended, navigating to next surah');
      goToNextSurah();
    },
    numericSpeed,
    autoplay
  );
  
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
    // Seek to the clicked verse and start playback
    const verseKey = `${chapterId}:${verseNumber}`;
    seekToVerse(verseKey);
    if (!isPlaying) {
      togglePlayPause();
    }
  }, [chapterId, seekToVerse, isPlaying, togglePlayPause]);

  const goToPreviousSurah = useCallback(() => {
    const prevChapterId = chapterId - 1;
    if (prevChapterId >= 1) {
      onNavigate('chapter', prevChapterId);
    }
  }, [chapterId, onNavigate]);

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
            <p className="text-sm text-muted-foreground mb-1" data-testid="text-surah-number">
              Surah {chapterId}
            </p>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-foreground" data-testid="text-chapter-title-english">
                {chapterInfo?.englishName || 'Al-Fatihah'}
              </h1>
              <h2 className="text-xl font-semibold text-foreground font-arabic" data-testid="text-chapter-title-arabic">
                {chapterInfo ? getDisplayArabicName(chapterInfo.arabicName) : 'ٱلْفَاتِحَةِ'}
              </h2>
            </div>
            {chapterId > 1 && chapterId !== 9 && chapterId <= 114 && (
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
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-base">Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger data-testid="menu-item-reciter" className="text-base">
                  <span>Reciter</span>
                  <span className="ml-auto text-sm text-muted-foreground">
                    {getReciterById(reciter)?.name || 'Mishary Alafasy'}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuLabel className="text-base">Select Reciter</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {getFeaturedReciters().map((r) => (
                    <DropdownMenuItem
                      key={r.id}
                      onClick={() => onReciterChange(r.id)}
                      className="flex items-center justify-between cursor-pointer"
                      data-testid={`reciter-option-${r.id}`}
                    >
                      <div className="flex flex-col">
                        <span className="text-base">{r.name}</span>
                        <span className="text-sm text-muted-foreground">{r.arabicName}</span>
                      </div>
                      {reciter === r.id && <Check className="w-4 h-4 ml-2 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="flex items-center justify-between cursor-pointer text-base"
                onSelect={(e) => e.preventDefault()}
                onClick={() => onDarkModeChange?.(!darkMode)}
                data-testid="menu-item-theme"
              >
                <span>Theme</span>
                <div className="relative">
                  <Switch 
                    checked={darkMode} 
                    onCheckedChange={onDarkModeChange}
                    onClick={(e) => e.stopPropagation()}
                    data-testid="switch-theme"
                    className="relative"
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
                    <Sun className="w-3.5 h-3.5 text-yellow-500" />
                    <Moon className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center justify-between cursor-pointer text-base"
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
                className="flex items-center justify-between cursor-pointer text-base"
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
        <div className="max-w-2xl mx-auto space-y-6">
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
                currentWordIndex={isCurrentVerse ? currentWordIndex : null}
                onClick={() => handleVerseClick(verseNumber)}
                arabicFontSize={arabicFontSize}
                translationFontSize={translationFontSize}
                transliterationFontSize={transliterationFontSize}
                lineSpacing={lineSpacing}
                showVerseNumbers={showVerseNumbers}
              />
            );
          })}
        </div>
      </main>

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
      />
    </div>
  );
}
