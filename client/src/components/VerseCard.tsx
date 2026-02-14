import { tokenizeArabicWords } from "@/lib/arabicTokenizer";

interface VerseCardProps {
  chapterId: number;
  verseNumber: number;
  arabicText: string;
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
}

export default function VerseCard({
  chapterId,
  verseNumber,
  arabicText,
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
  transliterationFontSize = "Small",
  lineSpacing = "Normal",
  showVerseNumbers = true,
  arabicScript = "uthmani",
}: VerseCardProps) {
  const highlighted = isCurrentVerse && isInVerseRange;

  const words = arabicScript !== 'tajweed' ? tokenizeArabicWords(arabicText) : [];

  const arabicFontClass = arabicScript === 'indopak' ? 'font-indopak' : 'font-arabic';

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
          ? 'bg-primary/[0.06] dark:bg-primary/[0.08]'
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
          {arabicScript === 'tajweed' ? (
            <p
              className={`${getArabicFontSize(arabicFontSize)} ${getArabicLineSpacing(lineSpacing)} ${arabicFontClass} text-right transition-colors`}
              dir="rtl"
              data-testid={`text-arabic-${verseNumber}`}
              dangerouslySetInnerHTML={{ __html: arabicText }}
            />
          ) : (
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
                return (
                  <span
                    key={`word-${chapterId}-${verseNumber}-${index}`}
                    id={`word-${chapterId}-${verseNumber}-${index}`}
                    className={`transition-all duration-150 ${
                      isCurrentWord ? 'text-primary font-bold' : ''
                    }`}
                  >
                    {word}{index < words.length - 1 ? ' ' : ''}
                  </span>
                );
              })}
            </p>
          )}
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
      {/* Thin divider at bottom */}
      <div className="mx-5 h-px bg-border/30" />
    </div>
  );
}
