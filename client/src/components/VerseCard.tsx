interface VerseCardProps {
  verseNumber: number;
  arabicText: string;
  transliteration?: string;
  translation: string;
  showTransliteration: boolean;
}

export default function VerseCard({
  verseNumber,
  arabicText,
  transliteration,
  translation,
  showTransliteration,
}: VerseCardProps) {
  return (
    <div className="space-y-4 p-4" data-testid={`card-verse-${verseNumber}`}>
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <span className="text-primary font-semibold text-sm flex-shrink-0" data-testid={`text-verse-number-${verseNumber}`}>
            Verse {verseNumber}
          </span>
        </div>
        <p 
          className="text-2xl md:text-3xl leading-loose text-foreground font-arabic text-right"
          dir="rtl"
          data-testid={`text-arabic-${verseNumber}`}
        >
          {arabicText}
        </p>
        {showTransliteration && transliteration && (
          <p className="text-sm text-muted-foreground italic" data-testid={`text-transliteration-${verseNumber}`}>
            {transliteration}
          </p>
        )}
        <p className="text-base text-foreground" data-testid={`text-translation-${verseNumber}`}>
          {translation}
        </p>
      </div>
    </div>
  );
}
