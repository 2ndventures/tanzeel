import { useEffect, useRef, useCallback, useState } from "react";
import { Icon } from "@iconify/react";
import { ArrowLeft, MoreVertical, Check, Sun, Moon, ChevronRight, ChevronLeft } from "lucide-react";
import VerseCard from "@/components/VerseCard";
import AudioPlayer from "@/components/AudioPlayer";
import { getChapterVerses, getChapterInfo, getDisplayArabicName } from "@/lib/quranData";
import { useWordTimingAudio } from "@/hooks/useWordTimingAudio";
import { getFeaturedReciters, getReciterById } from "@/lib/reciters";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { incrementVersesRead, addReadingTime } from "@/lib/readingStats";

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
        incrementVersesRead(1);
      }

      if (autoScroll) {
        // Parse verse key (e.g., "1:2" -> verse 2)
        const verseNumber = parseInt(verseKey.split(':')[1]);
        
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          const verseElement = document.querySelector(`[data-testid="card-verse-${verseNumber}"]`);
          
          if (verseElement) {
            // Calculate offset to center verse vertically in viewport
            const rect = verseElement.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const verseHeight = rect.height;
            
            // Center the verse: viewport center - verse center
            const offset = rect.top - (viewportHeight / 2) + (verseHeight / 2);
            
            console.log('📜 Auto-scroll verse', verseNumber, 'offset:', offset);
            
            // Scroll window to center verse in viewport
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
    
    console.log(`🖱️ Verse ${verseNumber} clicked - currentVerse: ${currentVerse}, isPlaying: ${isPlaying}, clickedCurrent: ${clickedCurrentVerse}`);
    
    if (clickedCurrentVerse && isPlaying) {
      // Clicking the currently playing verse pauses it
      console.log('⏸️ Pausing current verse');
      pauseAudio();
    } else {
      // Clicking a different verse seeks to it and starts playback
      seekToVerse(verseKey);
      if (!isPlaying) {
        console.log('▶️ Starting playback');
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 flex flex-col">
      {/* Rich layered gradients for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-slate-900/50 to-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />

      {/* Header - Glass Treatment */}
      <header className="sticky top-0 z-10 mt-4">
        <div className="relative overflow-hidden">
          {/* Glass background */}
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5" />
          
          <div className="relative flex items-center justify-between px-6 py-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            <button 
              className="flex size-12 items-center justify-center rounded-full bg-slate-800/60 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover-elevate ring-1 ring-white/10"
              onClick={onBack}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5 text-white" style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}} />
            </button>
            
            <div className="flex flex-col items-center flex-1 mx-4">
              <h1 className="text-2xl font-bold text-white mb-1" style={{textShadow: '0 4px 12px rgba(0,0,0,0.5)'}} data-testid="text-chapter-title-english">
                {chapterId}. {chapterInfo?.englishName || 'Al-Fatihah'}
              </h1>
              <p className="text-sm text-gray-400" data-testid="text-surah-number">
                {chapterInfo?.revelationType || 'The Opening'}
              </p>
            </div>
            
            <Sheet open={isMenuOpen} onOpenChange={(open) => { setIsMenuOpen(open); if (!open) setMenuView('main'); }}>
              <SheetTrigger asChild>
                <button 
                  className="flex size-12 items-center justify-center rounded-full bg-slate-800/60 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover-elevate ring-1 ring-white/10" 
                  data-testid="button-menu"
                >
                  <MoreVertical className="w-5 h-5 text-white" style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}} />
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
                </SheetTitle>
              </SheetHeader>

              <div className="overflow-y-auto h-[calc(85vh-80px)]">
                {menuView === 'main' && (
                  <div className="space-y-6">
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

                    {/* Text Appearance Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-3" data-testid="section-text-appearance">
                        Text Appearance
                      </h3>
                      <div className="space-y-1">
                        <button
                          onClick={() => setMenuView('display')}
                          className="w-full flex items-center justify-between p-4 min-h-[60px] hover-elevate active-elevate-2 rounded-md"
                          data-testid="menu-item-display"
                        >
                          <span className="text-lg">Text size & spacing</span>
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
      </header>

      <main className="relative flex-1 overflow-auto px-6 pt-6">
        <div className="max-w-2xl mx-auto space-y-4 pb-[50vh]">
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
