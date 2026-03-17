import { useState, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Verse } from "@/lib/quranMetadata";
import { tokenizeArabicWords, tokenizeTajweedWords } from "@/lib/arabicTokenizer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface HifzViewProps {
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

export default function HifzView({
  verses,
  isLoadingVerses,
  versesError,
  chapterId,
  currentVerse,
  currentWordIndex,
  isPlaying,
  arabicFontSize,
  translationFontSize,
  lineSpacing,
  arabicScript,
  onVerseClick,
  isCollapsed,
}: HifzViewProps) {
  const [revealedVerse, setRevealedVerse] = useState<number | null>(null);
  const [retained, setRetained] = useState<Set<number>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset retained set when chapter changes (handled via key in parent, but belt & suspenders)
  const chapterRef = useRef(chapterId);
  if (chapterRef.current !== chapterId) {
    chapterRef.current = chapterId;
    setRetained(new Set());
  }

  const arabicFontClass = arabicScript === 'indopak' ? 'font-indopak' : 'font-arabic';

  const toArabicIndic = (n: number): string =>
    String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);

  const getArabicFontSize = (size: string) => {
    switch (size) {
      case "Small": return "text-xl md:text-2xl";
      case "Medium": return "text-2xl md:text-3xl";
      case "Large": return "text-3xl md:text-4xl";
      case "Extra Large": return "text-4xl md:text-5xl";
      default: return "text-3xl md:text-4xl";
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

  const handlePointerDown = useCallback((verseNumber: number) => {
    if (isPlaying) return; // Disable reveal during playback
    setRevealedVerse(verseNumber);
  }, [isPlaying]);

  const handlePointerUp = useCallback(() => {
    setRevealedVerse(null);
  }, []);

  const toggleRetained = useCallback((verseNumber: number) => {
    setRetained(prev => {
      const next = new Set(prev);
      if (next.has(verseNumber)) {
        next.delete(verseNumber);
      } else {
        next.add(verseNumber);
      }
      return next;
    });
  }, []);

  const retainedCount = retained.size;
  const totalVerses = verses.length;
  const progressPercent = totalVerses > 0 ? (retainedCount / totalVerses) * 100 : 0;

  if (isLoadingVerses) {
    return (
      <div className="relative flex-1 overflow-y-auto px-6 pb-[240px] transition-[padding] duration-300"
        style={{ paddingTop: isCollapsed ? 'calc(80px + env(safe-area-inset-top, 0px))' : 'calc(100px + env(safe-area-inset-top, 0px))' }}>
        <div className="max-w-2xl mx-auto space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-3 p-6 rounded-2xl bg-card/80 backdrop-blur-xl">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (versesError) {
    return (
      <div className="relative flex-1 overflow-y-auto px-6 pb-[240px] transition-[padding] duration-300"
        style={{ paddingTop: isCollapsed ? 'calc(80px + env(safe-area-inset-top, 0px))' : 'calc(100px + env(safe-area-inset-top, 0px))' }}>
        <div className="text-center py-12 space-y-4">
          <Icon icon="mdi:alert-circle" className="w-16 h-16 mx-auto text-destructive" />
          <p className="text-lg text-destructive">{versesError}</p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="relative flex-1 overflow-y-auto px-6 pb-[240px] transition-[padding] duration-300"
      style={{ paddingTop: isCollapsed ? 'calc(80px + env(safe-area-inset-top, 0px))' : 'calc(100px + env(safe-area-inset-top, 0px))' }}
    >
      {/* Score bar */}
      <div className="sticky top-0 z-10 max-w-2xl mx-auto mb-4">
        <div className="rounded-xl bg-card/90 backdrop-blur-xl ring-1 ring-border/50 p-3 shadow-md">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-foreground">
              Retained: {retainedCount} / {totalVerses}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {verses.map((verse, index) => {
          const verseNumber = index + 1;
          const isCurrentVerse = currentVerse === verseNumber;
          const isRevealed = revealedVerse === verseNumber;
          const isRetained = retained.has(verseNumber);
          const isTajweed = arabicScript === 'tajweed';
          const words = isTajweed ? tokenizeTajweedWords(verse.arabicText) : tokenizeArabicWords(verse.arabicText);

          return (
            <div
              key={verseNumber}
              data-testid={`card-verse-${verseNumber}`}
              className={`relative rounded-2xl p-5 transition-all duration-300 ${
                isCurrentVerse
                  ? 'bg-primary/8 ring-1 ring-primary/30'
                  : isRetained
                    ? 'bg-emerald-500/8 ring-1 ring-emerald-500/30'
                    : 'bg-card/80 backdrop-blur-xl'
              }`}
            >
              {/* Header row: verse number + retain checkmark */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold tabular-nums ${
                  isCurrentVerse ? 'text-primary' : 'text-muted-foreground/70'
                }`}>
                  {chapterId}:{verseNumber}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRetained(verseNumber);
                  }}
                  className={`size-8 rounded-full flex items-center justify-center transition-all ${
                    isRetained
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                  aria-label={isRetained ? `Verse ${verseNumber} marked as retained` : `Mark verse ${verseNumber} as retained`}
                >
                  <Icon icon="solar:check-circle-bold" className="size-5" />
                </button>
              </div>

              {/* Arabic text — always crisp */}
              <div onClick={() => onVerseClick(verseNumber)} className="cursor-pointer">
                <p
                  className={`${getArabicFontSize(arabicFontSize)} ${getArabicLineSpacing(lineSpacing)} ${arabicFontClass} text-right mb-3 transition-colors`}
                  dir="rtl"
                >
                  {words.map((word, wIdx) => {
                    const isCurrentWord = isCurrentVerse &&
                      currentWordIndex !== null &&
                      currentWordIndex === wIdx &&
                      currentWordIndex < words.length;
                    return isTajweed ? (
                      <span
                        key={`hifz-${chapterId}-${verseNumber}-${wIdx}`}
                        id={`word-${chapterId}-${verseNumber}-${wIdx}`}
                        className={`transition-all duration-150 ${
                          isCurrentWord ? 'text-primary font-bold' : ''
                        }`}
                        dangerouslySetInnerHTML={{ __html: word + (wIdx < words.length - 1 ? ' ' : '') }}
                      />
                    ) : (
                      <span
                        key={`hifz-${chapterId}-${verseNumber}-${wIdx}`}
                        id={`word-${chapterId}-${verseNumber}-${wIdx}`}
                        className={`transition-all duration-150 ${
                          isCurrentWord ? 'text-primary font-bold' : ''
                        }`}
                      >
                        {word}{wIdx < words.length - 1 ? ' ' : ''}
                      </span>
                    );
                  })}
                  {arabicScript !== 'indopak' && verseNumber > 0 && (
                    <span className={`inline-block mx-1 select-none text-[0.7em] align-middle ${
                      isTajweed ? 'verse-end-ornament-tajweed' : 'verse-end-ornament'
                    }`}>
                      {'\u06DD'}{toArabicIndic(verseNumber)}
                    </span>
                  )}
                </p>
              </div>

              {/* Translation — blurred overlay, long-press to reveal */}
              <div
                onPointerDown={() => handlePointerDown(verseNumber)}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative touch-none"
              >
                <p className={`${getTranslationFontSize(translationFontSize)} text-foreground/80 ${
                  isRevealed ? 'hifz-revealed' : 'hifz-blurred'
                }`}>
                  {verse.translation}
                </p>
                {!isRevealed && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-xs font-medium text-muted-foreground/60 bg-card/80 px-3 py-1 rounded-full backdrop-blur-sm">
                      Hold to reveal
                    </span>
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
