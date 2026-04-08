import { useState, useCallback, useEffect } from "react";
import { Icon } from "@iconify/react";
import { tokenizeArabicWords, tokenizeTajweedWords } from "@/lib/arabicTokenizer";
import { isBookmarked, addBookmark, removeBookmark } from "@/lib/bookmarkService";
import { triggerHaptic } from "@/lib/haptics";

interface VerseCardProps {
  chapterId: number;
  verseNumber: number;
  arabicText: string;
  /** Pre-split word array (bypasses tokenization). Used for IndoPak where
   *  the script's text_indopak tokens can contain internal spaces. */
  arabicWords?: string[];
  transliteration?: string;
  translation: string;
  showTransliteration: boolean;
  showTranslation: boolean;
  isPlaying?: boolean;
  isCurrentVerse?: boolean;
  isInVerseRange?: boolean;
  currentWordIndex?: number | null;
  onClick?: () => void;
  arabicFontSize?: string;
  translationFontSize?: string;
  transliterationFontSize?: string;
  lineSpacing?: string;
  showVerseNumbers?: boolean;
  arabicScript?: 'uthmani' | 'indopak' | 'tajweed';
  onBookmarkChange?: () => void;
}

export default function VerseCard({
  chapterId,
  verseNumber,
  arabicText,
  arabicWords: arabicWordsProp,
  transliteration,
  translation,
  showTransliteration,
  showTranslation,
  isPlaying = false,
  isCurrentVerse = false,
  isInVerseRange = false,
  currentWordIndex = null,
  onClick,
  arabicFontSize = "Large",
  translationFontSize = "Medium",
  transliterationFontSize = "Off",
  lineSpacing = "Normal",
  showVerseNumbers = true,
  arabicScript = "uthmani",
  onBookmarkChange,
}: VerseCardProps) {
  const highlighted = isCurrentVerse && isInVerseRange;
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    isBookmarked(chapterId, verseNumber).then(setBookmarked);
  }, [chapterId, verseNumber]);

  // Use pre-split word array when provided (e.g. IndoPak, where internal spaces inside
  // text_indopak tokens would cause space-tokenization to produce wrong word count)
  const words = arabicWordsProp
    ? arabicWordsProp
    : arabicScript === 'tajweed'
      ? tokenizeTajweedWords(arabicText)
      : tokenizeArabicWords(arabicText);

  const arabicFontClass = arabicScript === 'indopak' ? 'font-indopak' : 'font-arabic';

  const toArabicIndic = (n: number): string =>
    String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);

  const handleBookmarkToggle = useCallback(async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    if (bookmarked) {
      await removeBookmark(chapterId, verseNumber);
      setBookmarked(false);
    } else {
      await addBookmark(chapterId, verseNumber);
      setBookmarked(true);
    }
    onBookmarkChange?.();
  }, [bookmarked, chapterId, verseNumber, onBookmarkChange]);

  const handleBookmarkKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBookmarkToggle(e);
    }
  }, [handleBookmarkToggle]);

  const getArabicFontSize = (size: string) => {
    switch(size) {
      case "Small": return "text-xl md:text-2xl";
      case "Medium": return "text-2xl md:text-3xl";
      case "Large": return "text-3xl md:text-4xl";
      case "Extra Large": return "text-4xl md:text-5xl";
      default: return "text-3xl md:text-4xl";
    }
  };

  const getTranslationFontSize = (size: string) => {
    switch(size) {
      case "Small": return "text-sm";
      case "Medium": return "text-base";
      case "Large": return "text-lg";
      default: return "text-base";
    }
  };

  const getTransliterationFontSize = (size: string) => {
    switch(size) {
      case "Small": return "text-xs";
      case "Medium": return "text-sm";
      case "Large": return "text-base";
      default: return "text-sm";
    }
  };

  const getLineSpacing = (spacing: string) => {
    switch(spacing) {
      case "Compact": return "leading-relaxed";
      case "Normal": return "leading-loose";
      case "Relaxed": return "leading-[2.25]";
      case "Loose": return "leading-[2.5]";
      default: return "leading-loose";
    }
  };

  const getArabicLineSpacing = (spacing: string) => {
    switch(spacing) {
      case "Compact": return "leading-[2]";
      case "Normal": return "leading-[2.4]";
      case "Relaxed": return "leading-[2.8]";
      case "Loose": return "leading-[3.2]";
      default: return "leading-[2.4]";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      className={`relative cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl ${
        highlighted
          ? 'bg-primary/[0.07]'
          : ''
      }`}
      data-testid={`card-verse-${verseNumber}`}
      data-playing={highlighted ? 'true' : 'false'}
      aria-current={highlighted ? 'true' : 'false'}
      aria-label={`Verse ${chapterId}:${verseNumber}. ${highlighted ? 'Currently playing. ' : ''}Click to ${isPlaying ? 'pause' : 'play'} this verse.`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="px-5 py-3">
        <div className={`space-y-2 ${getLineSpacing(lineSpacing)}`}>
          <div className="flex items-center justify-between gap-2">
            {showVerseNumbers && (
              <span
                className={`inline-block text-xs font-semibold tabular-nums transition-colors ${
                  highlighted
                    ? 'text-primary'
                    : 'text-muted-foreground/70'
                }`}
                data-testid={`text-verse-number-${verseNumber}`}
              >
                {verseNumber === 0 ? 'Preamble' : `${chapterId}:${verseNumber}`}
              </span>
            )}
            {!showVerseNumbers && <span />}
            <button
              onClick={handleBookmarkToggle}
              onKeyDown={handleBookmarkKeyDown}
              className="flex items-center justify-center w-8 h-8 rounded-full transition-colors shrink-0"
              aria-label={bookmarked ? `Remove bookmark for verse ${chapterId}:${verseNumber}` : `Bookmark verse ${chapterId}:${verseNumber}`}
              data-testid={`button-bookmark-${verseNumber}`}
            >
              <Icon
                icon={bookmarked ? "solar:bookmark-bold" : "solar:bookmark-linear"}
                className={`size-4 transition-colors ${
                  bookmarked ? 'text-primary' : 'text-muted-foreground/50'
                }`}
              />
            </button>
          </div>
          <p
            className={`${getArabicFontSize(arabicFontSize)} ${getArabicLineSpacing(lineSpacing)} ${arabicFontClass} text-right transition-colors`}
            dir="rtl"
            data-testid={`text-arabic-${verseNumber}`}
          >
            {words.map((word, index) => {
              const isCurrentWord = highlighted &&
                currentWordIndex !== null &&
                currentWordIndex === index &&
                currentWordIndex < words.length;
              return arabicScript === 'tajweed' ? (
                <span
                  key={`word-${chapterId}-${verseNumber}-${index}`}
                  id={`word-${chapterId}-${verseNumber}-${index}`}
                  className={`transition-all duration-150 ${
                    isCurrentWord ? 'active-word' : ''
                  }`}
                  dangerouslySetInnerHTML={{ __html: word + (index < words.length - 1 ? ' ' : '') }}
                />
              ) : (
                <span
                  key={`word-${chapterId}-${verseNumber}-${index}`}
                  id={`word-${chapterId}-${verseNumber}-${index}`}
                  className={`transition-all duration-150 ${
                    isCurrentWord ? 'active-word' : ''
                  }`}
                >
                  {word}{index < words.length - 1 ? ' ' : ''}
                </span>
              );
            })}
            {arabicScript !== 'indopak' && verseNumber > 0 && (
              <span className={arabicScript === 'tajweed' ? 'verse-end-ornament-tajweed' : 'verse-end-ornament'}>
                {toArabicIndic(verseNumber)}
              </span>
            )}
          </p>
          {showTransliteration && transliteration && (
            <p
              className={`${getTransliterationFontSize(transliterationFontSize)} italic transition-colors ${
                highlighted ? 'text-foreground/80' : 'text-muted-foreground'
              }`}
              data-testid={`text-transliteration-${verseNumber}`}
            >
              {transliteration}
            </p>
          )}
          {showTranslation && (
            <p
              className={`${getTranslationFontSize(translationFontSize)} transition-colors ${
                highlighted ? 'text-foreground' : 'text-foreground/80'
              }`}
              data-testid={`text-translation-${verseNumber}`}
            >
              {translation}
            </p>
          )}
        </div>
      </div>
      <div className="mx-5 h-px bg-border/30" />
    </div>
  );
}

function VerseCardSkeleton({ index }: { index: number }) {
  const delayClass = `animation-delay-${(index % 5) * 100}`;

  return (
    <div className="relative rounded-2xl" data-testid={`skeleton-verse-${index}`}>
      <div className="px-5 py-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className={`skeleton h-4 w-10 rounded ${delayClass}`} />
            <div className={`skeleton h-6 w-6 rounded-full ${delayClass}`} />
          </div>
          <div className="flex flex-col items-end gap-2" dir="rtl">
            <div className={`skeleton h-7 rounded ${delayClass}`} style={{ width: `${85 - (index % 3) * 10}%` }} />
            <div className={`skeleton h-7 rounded ${delayClass}`} style={{ width: `${75 - (index % 4) * 8}%` }} />
            {index % 3 !== 2 && (
              <div className={`skeleton h-7 rounded ${delayClass}`} style={{ width: `${50 + (index % 2) * 15}%` }} />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className={`skeleton h-4 rounded ${delayClass}`} style={{ width: `${95 - (index % 3) * 5}%` }} />
            <div className={`skeleton h-4 rounded ${delayClass}`} style={{ width: `${70 + (index % 4) * 7}%` }} />
          </div>
        </div>
      </div>
      <div className="mx-5 h-px bg-border/30" />
    </div>
  );
}

export { VerseCardSkeleton };
