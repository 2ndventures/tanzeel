interface VerseCardProps {
  verseNumber: number;
  arabicText: string;
  transliteration?: string;
  translation: string;
  showTransliteration: boolean;
  isPlaying?: boolean;
}

export default function VerseCard({
  verseNumber,
  arabicText,
  transliteration,
  translation,
  showTransliteration,
  isPlaying = false,
}: VerseCardProps) {
  return (
    <div 
      className={`space-y-4 p-4 transition-all duration-300 ${
        isPlaying ? 'bg-primary/10 border-l-4 border-l-primary' : ''
      }`}
      data-testid={`card-verse-${verseNumber}`}
    >
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <span 
            className={`font-semibold text-sm flex-shrink-0 transition-colors ${
              isPlaying ? 'text-primary' : 'text-primary'
            }`} 
            data-testid={`text-verse-number-${verseNumber}`}
          >
            {verseNumber === 0 ? 'Preamble' : `Verse ${verseNumber}`}
          </span>
        </div>
        <p 
          className={`text-2xl md:text-3xl leading-loose font-arabic text-right transition-colors ${
            isPlaying ? 'text-primary' : 'text-foreground'
          }`}
          dir="rtl"
          data-testid={`text-arabic-${verseNumber}`}
        >
          {arabicText}
        </p>
        {showTransliteration && transliteration && (
          <p 
            className={`text-sm italic transition-colors ${
              isPlaying ? 'text-primary/80' : 'text-muted-foreground'
            }`} 
            data-testid={`text-transliteration-${verseNumber}`}
          >
            {transliteration}
          </p>
        )}
        <p 
          className={`text-base transition-colors ${
            isPlaying ? 'text-foreground' : 'text-foreground'
          }`} 
          data-testid={`text-translation-${verseNumber}`}
        >
          {translation}
        </p>
      </div>
    </div>
  );
}
