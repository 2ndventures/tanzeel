import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Verse } from "@/lib/quranMetadata";
import { tokenizeArabicWords } from "@/lib/arabicTokenizer";

interface FocusedFlowViewProps {
  verses: Verse[];
  isLoadingVerses: boolean;
  versesError: string | null;
  chapterId: number;
  currentVerse: number;
  currentWordIndex: number | null;
  isPlaying: boolean;
  showTranslation: boolean;
  arabicFontSize: string;
  translationFontSize: string;
  lineSpacing: string;
  arabicScript: 'uthmani' | 'indopak' | 'tajweed';
  onVerseClick: (verseNumber: number) => void;
  isCollapsed: boolean;
}

export default function FocusedFlowView({
  verses,
  isLoadingVerses,
  versesError,
  chapterId,
  currentVerse,
  currentWordIndex,
  isPlaying,
  showTranslation,
  arabicFontSize,
  translationFontSize,
  lineSpacing,
  arabicScript,
  onVerseClick,
}: FocusedFlowViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [translationVisible, setTranslationVisible] = useState(showTranslation);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const arabicFontClass = arabicScript === 'indopak' ? 'font-indopak' : 'font-arabic';

  // Bumped one tier larger than standard for focused reading
  const getArabicFontSize = (size: string) => {
    switch (size) {
      case "Small": return "text-2xl md:text-3xl";
      case "Medium": return "text-3xl md:text-4xl";
      case "Large": return "text-4xl md:text-5xl";
      case "Extra Large": return "text-5xl md:text-6xl";
      default: return "text-4xl md:text-5xl";
    }
  };

  const getTranslationFontSize = (size: string) => {
    switch (size) {
      case "Small": return "text-sm";
      case "Medium": return "text-base";
      case "Large": return "text-lg";
      default: return "text-base";
    }
  };

  const getArabicLineSpacing = (spacing: string) => {
    switch (spacing) {
      case "Compact": return "leading-[2]";
      case "Normal": return "leading-[2.4]";
      case "Relaxed": return "leading-[2.8]";
      case "Loose": return "leading-[3.2]";
      default: return "leading-[2.4]";
    }
  };

  // Controls auto-hide
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Listen for interactions to show controls
  useEffect(() => {
    const handleInteraction = () => resetControlsTimer();
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener('touchstart', handleInteraction, { passive: true });
    container.addEventListener('click', handleInteraction);
    container.addEventListener('mousemove', handleInteraction);
    return () => {
      container.removeEventListener('touchstart', handleInteraction);
      container.removeEventListener('click', handleInteraction);
      container.removeEventListener('mousemove', handleInteraction);
    };
  }, [resetControlsTimer]);

  // Auto-pan to current verse
  useEffect(() => {
    if (!scrollContainerRef.current || !currentVerse) return;
    const verseEl = scrollContainerRef.current.querySelector(
      `[data-verse-number="${currentVerse}"]`
    );
    if (verseEl) {
      verseEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [currentVerse]);

  if (isLoadingVerses) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (versesError) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <Icon icon="mdi:alert-circle" className="w-16 h-16 mx-auto text-destructive" />
          <p className="text-lg text-destructive">{versesError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Translation toggle button */}
      <button
        onClick={() => setTranslationVisible(v => !v)}
        className={`fixed top-24 right-6 z-30 size-12 rounded-full bg-muted/80 backdrop-blur-xl flex items-center justify-center shadow-lg ring-1 ring-border/50 transition-all duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } ${translationVisible ? 'text-primary' : 'text-muted-foreground'}`}
        aria-label={translationVisible ? "Hide translation" : "Show translation"}
        data-testid="button-translation-toggle"
      >
        <span className="text-sm font-bold">T</span>
      </button>

      {/* Vertical scroll container */}
      <div
        ref={scrollContainerRef}
        className="vertical-verse-scroll flex flex-col overflow-y-auto overflow-x-hidden h-full"
      >
        {verses.map((verse, index) => {
          const verseNumber = index + 1;
          const distance = Math.abs(verseNumber - currentVerse);
          const isCurrentVerse = distance === 0;
          const words = arabicScript !== 'tajweed' ? tokenizeArabicWords(verse.arabicText) : [];

          let scaleOpacityClass = 'opacity-100 scale-100';
          if (distance === 1) {
            scaleOpacityClass = 'opacity-40 scale-[0.85]';
          } else if (distance >= 2) {
            scaleOpacityClass = 'opacity-20 scale-75';
          }

          return (
            <div
              key={verseNumber}
              data-verse-number={verseNumber}
              className={`flex-shrink-0 w-full h-full snap-center flex items-center justify-center transition-all duration-500 ${scaleOpacityClass}`}
              onClick={() => onVerseClick(verseNumber)}
            >
              <div className="max-w-lg w-full px-8 text-center space-y-6">
                {/* Verse number label */}
                <span className={`inline-block text-xs font-semibold tabular-nums ${
                  isCurrentVerse ? 'text-primary' : 'text-muted-foreground/70'
                }`}>
                  {verseNumber === 0 ? 'Preamble' : `${chapterId}:${verseNumber}`}
                </span>

                {/* Arabic text */}
                {arabicScript === 'tajweed' ? (
                  <p
                    className={`${getArabicFontSize(arabicFontSize)} ${getArabicLineSpacing(lineSpacing)} ${arabicFontClass} text-center transition-colors`}
                    dir="rtl"
                    dangerouslySetInnerHTML={{ __html: verse.arabicText }}
                  />
                ) : (
                  <p
                    className={`${getArabicFontSize(arabicFontSize)} ${getArabicLineSpacing(lineSpacing)} ${arabicFontClass} text-center transition-colors`}
                    dir="rtl"
                  >
                    {words.map((word, wIdx) => {
                      const isCurrentWord = isCurrentVerse &&
                        currentWordIndex !== null &&
                        currentWordIndex === wIdx &&
                        currentWordIndex < words.length;
                      return (
                        <span
                          key={`fw-${chapterId}-${verseNumber}-${wIdx}`}
                          className={`transition-all duration-150 ${
                            isCurrentWord ? 'text-primary font-bold' : ''
                          }`}
                        >
                          {word}{wIdx < words.length - 1 ? ' ' : ''}
                        </span>
                      );
                    })}
                  </p>
                )}

                {/* Translation */}
                <div className={`transition-all duration-300 overflow-hidden ${
                  translationVisible ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <p className={`${getTranslationFontSize(translationFontSize)} transition-colors ${
                    isCurrentVerse ? 'text-foreground' : 'text-foreground/80'
                  }`}>
                    {verse.translation}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
