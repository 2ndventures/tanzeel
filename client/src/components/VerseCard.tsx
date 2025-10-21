import { useState, useEffect } from 'react';

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
}: VerseCardProps) {
  // Calculate if this verse should be highlighted
  const shouldHighlight = isPlaying && isCurrentVerse && isInVerseRange;
  
  // Use state to ensure re-renders
  const [highlighted, setHighlighted] = useState(shouldHighlight);
  
  // Update highlighted state when shouldHighlight changes
  useEffect(() => {
    setHighlighted(shouldHighlight);
    if (shouldHighlight) {
      console.log(`📍 Highlighting verse ${verseNumber}: isPlaying=${isPlaying}, isCurrentVerse=${isCurrentVerse}, isInVerseRange=${isInVerseRange}, wordIndex=${currentWordIndex}`);
    }
  }, [shouldHighlight, isPlaying, isCurrentVerse, isInVerseRange, verseNumber, currentWordIndex]);
  
  // Split Arabic text into words for word-level highlighting
  const words = arabicText.split(' ');
  
  // Use inline styles + data attribute for highlighting to bypass className issues
  const highlightStyles: React.CSSProperties = highlighted ? {
    backgroundColor: 'rgba(77, 124, 254, 0.1)', // #4d7cfe with 10% opacity
    borderLeft: '4px solid #4d7cfe', // primary color
  } : {};
  
  return (
    <div 
      className="space-y-4 p-4 transition-all duration-300 cursor-pointer hover-elevate"
      style={highlightStyles}
      data-testid={`card-verse-${verseNumber}`}
      data-playing={highlighted ? 'true' : 'false'}
      aria-current={highlighted ? 'true' : 'false'}
      role="article"
      onClick={onClick}
    >
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <span 
            className={`font-semibold text-sm flex-shrink-0 transition-colors ${
              highlighted ? 'text-primary' : 'text-primary'
            }`} 
            data-testid={`text-verse-number-${verseNumber}`}
          >
            {verseNumber === 0 ? 'Preamble' : `${chapterId}:${verseNumber}`}
          </span>
        </div>
        <p 
          className={`text-2xl md:text-3xl leading-loose font-arabic text-right transition-colors ${
            highlighted ? 'text-primary' : 'text-foreground'
          }`}
          dir="rtl"
          data-testid={`text-arabic-${verseNumber}`}
        >
          {words.map((word, index) => {
            // Only highlight if currentWordIndex is valid and within bounds
            const isCurrentWord = highlighted && 
              currentWordIndex !== null && 
              currentWordIndex === index &&
              currentWordIndex < words.length;
            return (
              <span
                key={`word-${chapterId}-${verseNumber}-${index}`}
                id={`word-${chapterId}-${verseNumber}-${index}`}
                className={`transition-all duration-200 ${
                  isCurrentWord ? 'text-primary font-bold' : ''
                }`}
                style={isCurrentWord ? {
                  backgroundColor: 'rgba(77, 124, 254, 0.2)',
                  padding: '0 4px',
                  borderRadius: '4px',
                } : {}}
              >
                {word}{index < words.length - 1 ? ' ' : ''}
              </span>
            );
          })}
        </p>
        {showTransliteration && transliteration && (
          <p 
            className={`text-sm italic transition-colors ${
              highlighted ? 'text-primary/80' : 'text-muted-foreground'
            }`} 
            data-testid={`text-transliteration-${verseNumber}`}
          >
            {transliteration}
          </p>
        )}
        {showTranslation && (
          <p 
            className={`text-base transition-colors ${
              highlighted ? 'text-foreground' : 'text-foreground'
            }`} 
            data-testid={`text-translation-${verseNumber}`}
          >
            {translation}
          </p>
        )}
      </div>
    </div>
  );
}
