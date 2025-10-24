import { useEffect, useRef, useCallback, useState } from "react";
import { ArrowLeft, MoreVertical, Check, Sun, Moon, ChevronRight, ChevronLeft } from "lucide-react";
import VerseCard from "@/components/VerseCard";
import AudioPlayer from "@/components/AudioPlayer";
import { getChapterVerses, getChapterInfo, getDisplayArabicName } from "@/lib/quranData";
import { useWordTimingAudio } from "@/hooks/useWordTimingAudio";
import { getFeaturedReciters, getReciterById } from "@/lib/reciters";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

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
  onArabicFontSizeChange?: (size: string) => void;
  onTranslationFontSizeChange?: (size: string) => void;
  onTransliterationFontSizeChange?: (size: string) => void;
  onLineSpacingChange?: (spacing: string) => void;
  onShowVerseNumbersChange?: (enabled: boolean) => void;
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
  showVerseNumbers,
  onArabicFontSizeChange,
  onTranslationFontSizeChange,
  onTransliterationFontSizeChange,
  onLineSpacingChange,
  onShowVerseNumbersChange
}: ChapterViewProps) {
  const chapterInfo = getChapterInfo(chapterId);
  const verses = getChapterVerses(chapterId);
  
  // State for managing menu navigation
  const [menuView, setMenuView] = useState<'main' | 'display' | 'reciter' | 'arabic' | 'translation' | 'transliteration' | 'spacing'>('main');
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
            // Account for the sticky header (95px) to position verse at top below header
            const headerHeight = 95;
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
        <div className="flex items-center justify-between px-4 py-5">
          <button 
            className="p-2 hover-elevate active-elevate-2 rounded-md"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <div className="flex flex-col items-center flex-1 mx-2 gap-1">
            <p className="text-sm text-muted-foreground" data-testid="text-surah-number">
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
          <Sheet open={isMenuOpen} onOpenChange={(open) => { setIsMenuOpen(open); if (!open) setMenuView('main'); }}>
            <SheetTrigger asChild>
              <button 
                className="p-2 hover-elevate active-elevate-2 rounded-md" 
                data-testid="button-menu"
              >
                <MoreVertical className="w-6 h-6 text-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh]">
              <SheetHeader className="mb-4">
                {menuView !== 'main' && (
                  <Button variant="ghost" size="icon" className="absolute left-4 top-4" onClick={() => setMenuView('main')}>
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
                </SheetTitle>
              </SheetHeader>

              <div className="overflow-y-auto h-[calc(85vh-80px)]">
                {menuView === 'main' && (
                  <div className="space-y-1">
                    <button
                      onClick={() => setMenuView('display')}
                      className="w-full flex items-center justify-between p-4 hover-elevate active-elevate-2 rounded-md text-lg"
                      data-testid="menu-item-display"
                    >
                      <span>Display</span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                    
                    <button
                      onClick={() => setMenuView('reciter')}
                      className="w-full flex items-center justify-between p-4 hover-elevate active-elevate-2 rounded-md"
                      data-testid="menu-item-reciter"
                    >
                      <span className="text-lg">Reciter</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{getReciterById(reciter)?.name || 'Mishary Alafasy'}</span>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </button>

                    <div className="flex items-center justify-between p-4" data-testid="menu-item-theme">
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
      </header>

      <main className="flex-1 overflow-auto px-4 pt-6">
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
