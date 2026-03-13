import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Icon } from "@iconify/react";
import { Verse } from "@/lib/quranMetadata";
import { tokenizeArabicWords, applyTafkhimColoring } from "@/lib/arabicTokenizer";

const WORDS_PER_PAGE = 18;

interface PageEntry {
  verseNumber: number;
  verseIndex: number;
  pageIndex: number;
  totalPages: number;
  words: string[];
  wordOffset: number;
  translation: string | null;
  arabicText: string;
  isTajweed: boolean;
}

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

  const pages = useMemo<PageEntry[]>(() => {
    const result: PageEntry[] = [];
    const isTajweed = arabicScript === 'tajweed';

    verses.forEach((verse, index) => {
      const verseNumber = index + 1;

      if (isTajweed) {
        result.push({
          verseNumber,
          verseIndex: index,
          pageIndex: 0,
          totalPages: 1,
          words: [],
          wordOffset: 0,
          translation: verse.translation,
          arabicText: verse.arabicText,
          isTajweed: true,
        });
        return;
      }

      const words = tokenizeArabicWords(verse.arabicText);

      if (words.length <= WORDS_PER_PAGE) {
        result.push({
          verseNumber,
          verseIndex: index,
          pageIndex: 0,
          totalPages: 1,
          words,
          wordOffset: 0,
          translation: verse.translation,
          arabicText: verse.arabicText,
          isTajweed: false,
        });
      } else {
        const totalPages = Math.ceil(words.length / WORDS_PER_PAGE);
        for (let p = 0; p < totalPages; p++) {
          const start = p * WORDS_PER_PAGE;
          const chunk = words.slice(start, start + WORDS_PER_PAGE);
          result.push({
            verseNumber,
            verseIndex: index,
            pageIndex: p,
            totalPages,
            words: chunk,
            wordOffset: start,
            translation: p === totalPages - 1 ? verse.translation : null,
            arabicText: verse.arabicText,
            isTajweed: false,
          });
        }
      }
    });

    return result;
  }, [verses, arabicScript]);

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

  useEffect(() => {
    if (!scrollContainerRef.current || !currentVerse) return;

    let targetPageIdx = -1;
    if (currentWordIndex !== null && currentWordIndex >= 0) {
      targetPageIdx = pages.findIndex(
        (p) =>
          p.verseNumber === currentVerse &&
          currentWordIndex >= p.wordOffset &&
          currentWordIndex < p.wordOffset + p.words.length
      );
    }
    if (targetPageIdx === -1) {
      targetPageIdx = pages.findIndex((p) => p.verseNumber === currentVerse && p.pageIndex === 0);
    }
    if (targetPageIdx === -1) return;

    const el = scrollContainerRef.current.querySelector(
      `[data-page-index="${targetPageIdx}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [currentVerse, currentWordIndex, pages]);

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

      <div
        ref={scrollContainerRef}
        className="vertical-verse-scroll flex flex-col overflow-y-auto overflow-x-hidden h-full"
      >
        {pages.map((page, globalIdx) => {
          const distance = Math.abs(page.verseNumber - currentVerse);
          const isCurrentVerse = distance === 0;

          let scaleOpacityClass = 'opacity-100 scale-100';
          if (distance === 1) {
            scaleOpacityClass = 'opacity-40 scale-[0.85]';
          } else if (distance >= 2) {
            scaleOpacityClass = 'opacity-20 scale-75';
          }

          const verseLabel = page.verseNumber === 0
            ? 'Preamble'
            : page.totalPages > 1
              ? `${chapterId}:${page.verseNumber} (${page.pageIndex + 1}/${page.totalPages})`
              : `${chapterId}:${page.verseNumber}`;

          return (
            <div
              key={`${page.verseNumber}-${page.pageIndex}`}
              data-verse-number={page.verseNumber}
              data-page-index={globalIdx}
              className={`flex-shrink-0 w-full h-full snap-center flex items-center justify-center transition-all duration-500 ${scaleOpacityClass}`}
              onClick={() => onVerseClick(page.verseNumber)}
            >
              <div className="max-w-lg w-full px-8 text-center space-y-6">
                <span className={`inline-block text-xs font-semibold tabular-nums ${
                  isCurrentVerse ? 'text-primary' : 'text-muted-foreground/70'
                }`}>
                  {verseLabel}
                </span>

                {page.isTajweed ? (
                  <p
                    className={`${getArabicFontSize(arabicFontSize)} ${getArabicLineSpacing(lineSpacing)} ${arabicFontClass} text-center transition-colors`}
                    dir="rtl"
                    dangerouslySetInnerHTML={{ __html: applyTafkhimColoring(page.arabicText) }}
                  />
                ) : (
                  <p
                    className={`${getArabicFontSize(arabicFontSize)} ${getArabicLineSpacing(lineSpacing)} ${arabicFontClass} text-center transition-colors`}
                    dir="rtl"
                  >
                    {page.words.map((word, wIdx) => {
                      const globalWordIdx = page.wordOffset + wIdx;
                      const isCurrentWord = isCurrentVerse &&
                        currentWordIndex !== null &&
                        currentWordIndex === globalWordIdx;
                      return (
                        <span
                          key={`fw-${chapterId}-${page.verseNumber}-${globalWordIdx}`}
                          className={`transition-all duration-150 ${
                            isCurrentWord ? 'text-primary font-bold' : ''
                          }`}
                        >
                          {word}{wIdx < page.words.length - 1 ? ' ' : ''}
                        </span>
                      );
                    })}
                    {page.totalPages > 1 && page.pageIndex < page.totalPages - 1 && (
                      <span className="text-muted-foreground/40"> ...</span>
                    )}
                  </p>
                )}

                {page.translation && (
                  <div className={`transition-all duration-300 overflow-hidden ${
                    translationVisible ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <p className={`${getTranslationFontSize(translationFontSize)} transition-colors ${
                      isCurrentVerse ? 'text-foreground' : 'text-foreground/80'
                    }`}>
                      {page.translation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
