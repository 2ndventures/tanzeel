import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Verse } from "@/lib/quranMetadata";
import { tokenizeArabicWords, applyTafkhimColoring } from "@/lib/arabicTokenizer";
import { tafsirService, DEFAULT_TAFSIR_ID, TafsirEntry } from "@/services/tafsirService";
import { Skeleton } from "@/components/ui/skeleton";
import { VerseCardSkeleton } from "@/components/VerseCard";
import { Button } from "@/components/ui/button";

interface ScientificViewProps {
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

export default function ScientificView({
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
}: ScientificViewProps) {
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'words' | 'tafsir'>('words');
  const [tafsirData, setTafsirData] = useState<TafsirEntry[]>([]);
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirError, setTafsirError] = useState<string | null>(null);
  const wordListRef = useRef<HTMLDivElement>(null);

  const arabicFontClass = arabicScript === 'indopak' ? 'font-indopak' : 'font-arabic';

  // Sync selectedWordIndex from audio
  useEffect(() => {
    if (currentWordIndex !== null && isPlaying) {
      setSelectedWordIndex(currentWordIndex);
    }
  }, [currentWordIndex, isPlaying]);

  // Fetch tafsir data when chapter changes
  useEffect(() => {
    let cancelled = false;
    setTafsirLoading(true);
    setTafsirError(null);

    tafsirService.getTafsirForChapter(DEFAULT_TAFSIR_ID, chapterId)
      .then(data => {
        if (!cancelled) {
          setTafsirData(data);
          setTafsirLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Failed to load tafsir:', err);
          setTafsirError('Failed to load tafsir. Please try again.');
          setTafsirLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [chapterId]);

  // Auto-scroll word list when selectedWordIndex changes
  useEffect(() => {
    if (selectedWordIndex === null || !wordListRef.current) return;
    const el = wordListRef.current.querySelector(`[data-word-index="${selectedWordIndex}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedWordIndex]);

  const handleWordClick = useCallback((index: number) => {
    setSelectedWordIndex(index);
  }, []);

  const goToPrev = useCallback(() => {
    if (currentVerse > 1) {
      onVerseClick(currentVerse - 1);
      setSelectedWordIndex(null);
    }
  }, [currentVerse, onVerseClick]);

  const goToNext = useCallback(() => {
    if (currentVerse < verses.length) {
      onVerseClick(currentVerse + 1);
      setSelectedWordIndex(null);
    }
  }, [currentVerse, verses.length, onVerseClick]);

  if (isLoadingVerses) {
    return (
      <div className={`relative flex-1 overflow-y-auto px-4 pb-nav-clearance transition-[padding] duration-300 ${
        isCollapsed ? 'pt-[80px]' : 'pt-[100px]'
      }`}>
        <div className="max-w-4xl mx-auto space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/30 overflow-hidden">
              <div className="p-4">
                <VerseCardSkeleton index={i} />
              </div>
              <div className="border-t border-border/20 p-4 space-y-2">
                <div className={`skeleton h-3 w-24 rounded animation-delay-${(i % 5) * 100}`} />
                <div className={`skeleton h-4 w-full rounded animation-delay-${((i + 1) % 5) * 100}`} />
                <div className={`skeleton h-4 w-5/6 rounded animation-delay-${((i + 2) % 5) * 100}`} />
                <div className={`skeleton h-4 w-3/4 rounded animation-delay-${((i + 3) % 5) * 100}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (versesError) {
    return (
      <div className={`relative flex-1 overflow-y-auto px-4 pb-nav-clearance transition-[padding] duration-300 ${
        isCollapsed ? 'pt-[80px]' : 'pt-[100px]'
      }`}>
        <div className="text-center py-12 space-y-4">
          <Icon icon="mdi:alert-circle" className="w-16 h-16 mx-auto text-destructive" />
          <p className="text-lg text-destructive">{versesError}</p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      </div>
    );
  }

  const verse = verses[currentVerse - 1];
  if (!verse) return null;

  const arabicWords = arabicScript !== 'tajweed' ? tokenizeArabicWords(verse.arabicText) : [];
  const translitWords = verse.transliteration ? verse.transliteration.split(' ') : [];
  // Pad arrays to same length
  const maxLen = Math.max(arabicWords.length, translitWords.length);
  while (arabicWords.length < maxLen) arabicWords.push('');
  while (translitWords.length < maxLen) translitWords.push('');

  const verseKey = `${chapterId}:${currentVerse}`;
  const currentTafsir = tafsirService.getTafsirForVerse(tafsirData, verseKey);

  const getArabicLineSpacing = (spacing: string) => {
    switch (spacing) {
      case "Compact": return "leading-[1.8]";
      case "Normal": return "leading-[2.2]";
      case "Relaxed": return "leading-[2.6]";
      case "Loose": return "leading-[3]";
      default: return "leading-[2.2]";
    }
  };

  return (
    <div className={`relative flex-1 overflow-y-auto px-4 pb-nav-clearance transition-[padding] duration-300 ${
      isCollapsed ? 'pt-[80px]' : 'pt-[100px]'
    }`}>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Top Pane: Arabic text */}
        <div className="rounded-2xl bg-card/80 backdrop-blur-xl p-5 ring-1 ring-border/30">
          {/* Verse navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goToPrev}
              disabled={currentVerse <= 1}
              className="size-9 rounded-full flex items-center justify-center bg-muted/60 disabled:opacity-30 transition-opacity"
              aria-label="Previous verse"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {chapterId}:{currentVerse}
            </span>
            <button
              onClick={goToNext}
              disabled={currentVerse >= verses.length}
              className="size-9 rounded-full flex items-center justify-center bg-muted/60 disabled:opacity-30 transition-opacity"
              aria-label="Next verse"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          {/* Arabic text with clickable words */}
          {arabicScript === 'tajweed' ? (
            <p
              className={`text-xl md:text-2xl ${getArabicLineSpacing(lineSpacing)} ${arabicFontClass} text-right transition-colors`}
              dir="rtl"
              dangerouslySetInnerHTML={{ __html: applyTafkhimColoring(verse.arabicText) }}
            />
          ) : (
            <p
              className={`text-xl md:text-2xl ${getArabicLineSpacing(lineSpacing)} ${arabicFontClass} text-right transition-colors`}
              dir="rtl"
            >
              {arabicWords.map((word, wIdx) => {
                if (!word) return null;
                const isSelected = selectedWordIndex === wIdx;
                const isAudioWord = currentWordIndex === wIdx && isPlaying;
                return (
                  <span
                    key={`sci-ar-${chapterId}-${currentVerse}-${wIdx}`}
                    onClick={() => handleWordClick(wIdx)}
                    className={`cursor-pointer transition-all duration-150 inline-block px-0.5 rounded ${
                      isSelected || isAudioWord
                        ? 'active-word'
                        : 'hover:text-primary/70'
                    }`}
                  >
                    {word}{wIdx < arabicWords.length - 1 ? ' ' : ''}
                  </span>
                );
              })}
            </p>
          )}

          {/* Translation (small) */}
          <p className="text-sm text-muted-foreground mt-3">
            {verse.translation}
          </p>
        </div>

        {/* Bottom Pane: Word Analysis + Tafsir */}
        <div className="md:grid md:grid-cols-2 md:gap-4">
          {/* Mobile tabs */}
          <div className="flex md:hidden mb-3 gap-2">
            <button
              onClick={() => setActiveTab('words')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'words'
                  ? 'bg-primary/20 text-primary ring-1 ring-primary/40'
                  : 'bg-muted/40 text-muted-foreground'
              }`}
            >
              Word Analysis
            </button>
            <button
              onClick={() => setActiveTab('tafsir')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'tafsir'
                  ? 'bg-primary/20 text-primary ring-1 ring-primary/40'
                  : 'bg-muted/40 text-muted-foreground'
              }`}
            >
              Tafsir
            </button>
          </div>

          {/* Word Analysis pane */}
          <div className={`rounded-2xl bg-card/80 backdrop-blur-xl p-4 ring-1 ring-border/30 ${
            activeTab !== 'words' ? 'hidden md:block' : ''
          }`}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Word Analysis
            </h3>
            <div ref={wordListRef} className="space-y-1 max-h-[40vh] overflow-y-auto">
              {arabicScript === 'tajweed' ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Word analysis unavailable in Tajweed mode
                </p>
              ) : (
                arabicWords.map((word, wIdx) => {
                  if (!word) return null;
                  const isSelected = selectedWordIndex === wIdx;
                  const isAudioWord = currentWordIndex === wIdx && isPlaying;
                  return (
                    <button
                      key={`sci-word-${wIdx}`}
                      data-word-index={wIdx}
                      onClick={() => handleWordClick(wIdx)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all ${
                        isSelected || isAudioWord
                          ? 'scientific-word-active'
                          : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className={`${arabicFontClass} text-lg`} dir="rtl">{word}</span>
                        <span className="text-xs text-muted-foreground italic">
                          {translitWords[wIdx] || '—'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums">
                        {wIdx + 1}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Tafsir pane */}
          <div className={`rounded-2xl bg-card/80 backdrop-blur-xl p-4 ring-1 ring-border/30 ${
            activeTab !== 'tafsir' ? 'hidden md:block' : ''
          } ${activeTab === 'tafsir' ? '' : 'md:mt-0 mt-4'}`}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Tafsir Ibn Kathir
            </h3>
            <div className="max-h-[40vh] overflow-y-auto">
              {tafsirLoading ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : tafsirError ? (
                <div className="text-center py-4 space-y-2">
                  <Icon icon="mdi:alert-circle-outline" className="size-8 mx-auto text-destructive/60" />
                  <p className="text-sm text-destructive/80">{tafsirError}</p>
                </div>
              ) : currentTafsir ? (
                <div
                  className="scientific-tafsir text-sm text-foreground/90"
                  dangerouslySetInnerHTML={{ __html: currentTafsir.text }}
                />
              ) : (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  No tafsir available for this verse
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
