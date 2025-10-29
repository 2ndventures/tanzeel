import { useEffect } from 'react';

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
}: VerseCardProps) {
  // Calculate if this verse should be highlighted
  const highlighted = isPlaying && isCurrentVerse && isInVerseRange;
  
  // Debug logging
  useEffect(() => {
    if (highlighted) {
      console.log(`✅ VERSE ${verseNumber} IS HIGHLIGHTED - isPlaying=${isPlaying}, isCurrentVerse=${isCurrentVerse}, wordIndex=${currentWordIndex}`);
    }
  }, [highlighted, verseNumber, isPlaying, isCurrentVerse, currentWordIndex]);
  
  // Split Arabic text into words for word-level highlighting
  const words = arabicText.split(' ');
  
  // Font size mappings
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
  
  return (
    <div 
      className={`relative group overflow-hidden rounded-3xl p-[1px] shadow-lg shadow-[0_8px_24px_rgba(0,0,0,0.5)] cursor-pointer hover-elevate transition-all duration-300 ${
        highlighted ? 'shadow-[0_12px_32px_rgba(0,0,0,0.7)]' : ''
      }`}
      data-testid={`card-verse-${verseNumber}`}
      data-playing={highlighted ? 'true' : 'false'}
      aria-current={highlighted ? 'true' : 'false'}
      role="article"
      onClick={onClick}
    >
      {/* Gradient border */}
      <div className={`absolute inset-0 rounded-3xl transition-all ${
        highlighted ? 'bg-gradient-to-br from-primary/30 to-transparent' : 'bg-gradient-to-br from-white/10 to-transparent'
      }`} />
      
      {/* Inner glass panel */}
      <div className={`relative overflow-visible rounded-3xl p-6 backdrop-blur-xl transition-all ${
        highlighted ? 'bg-slate-800/60' : 'bg-slate-900/70'
      }`}>
        <div className={`space-y-6 ${getLineSpacing(lineSpacing)}`}>
          {showVerseNumbers && (
            <div className="flex items-start gap-2">
              <span 
                className={`font-bold text-sm flex-shrink-0 transition-all px-4 py-2 rounded-full shadow-inner ring-1 ${
                  highlighted 
                    ? 'bg-primary/25 text-primary ring-primary/30 shadow-[0_4px_12px_rgba(0,0,0,0.6)]' 
                    : 'bg-slate-800/60 text-gray-400 ring-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.5)]'
                }`}
                style={highlighted ? {textShadow: '0 2px 4px rgba(0,0,0,0.5)'} : {}}
                data-testid={`text-verse-number-${verseNumber}`}
              >
                {verseNumber === 0 ? 'Preamble' : `${chapterId}:${verseNumber}`}
              </span>
            </div>
          )}
          <p 
            className={`${getArabicFontSize(arabicFontSize)} font-arabic text-right transition-colors ${
              highlighted ? 'text-white' : 'text-white'
            }`}
            style={{textShadow: '0 2px 8px rgba(0,0,0,0.4)'}}
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
                    backgroundColor: 'rgba(255, 214, 10, 0.15)',
                    padding: '0 6px',
                    borderRadius: '6px',
                    textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  } : {}}
                >
                  {word}{index < words.length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </p>
          {showTransliteration && transliteration && (
            <p 
              className={`${getTransliterationFontSize(transliterationFontSize)} italic transition-colors ${
                highlighted ? 'text-gray-300' : 'text-gray-400'
              }`} 
              data-testid={`text-transliteration-${verseNumber}`}
            >
              {transliteration}
            </p>
          )}
          {showTranslation && (
            <p 
              className={`${getTranslationFontSize(translationFontSize)} transition-colors ${
                highlighted ? 'text-white' : 'text-gray-300'
              }`} 
              data-testid={`text-translation-${verseNumber}`}
            >
              {translation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
