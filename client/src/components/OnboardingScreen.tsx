import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { chapters, Verse } from "@/lib/quranMetadata";
import { lazyChapterService } from "@/services/lazyChapterService";

interface OnboardingScreenProps {
  onComplete: () => void;
  arabicFontSize: string;
  onArabicFontSizeChange: (value: string) => void;
  translationFontSize: string;
  onTranslationFontSizeChange: (value: string) => void;
  transliterationFontSize: string;
  onTransliterationFontSizeChange: (value: string) => void;
  darkMode: boolean;
  onDarkModeChange: (isDark: boolean) => void;
}

export default function OnboardingScreen({
  onComplete,
  arabicFontSize,
  onArabicFontSizeChange,
  translationFontSize,
  onTranslationFontSizeChange,
  transliterationFontSize,
  onTransliterationFontSizeChange,
  darkMode,
  onDarkModeChange,
}: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [exampleVerses, setExampleVerses] = useState<Verse[]>([]);
  const [isLoadingVerses, setIsLoadingVerses] = useState(true);

  // Load Al-Fatiha verses for preview
  useEffect(() => {
    lazyChapterService.getVerses(1)
      .then(verses => {
        setExampleVerses(verses);
        setIsLoadingVerses(false);
      })
      .catch(err => {
        console.error('Failed to load example verses:', err);
        setIsLoadingVerses(false);
      });
  }, []);

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
      case "Extra Large": return "text-xl";
      default: return "text-base";
    }
  };

  const getTransliterationFontSize = (size: string) => {
    switch(size) {
      case "Small": return "text-xs";
      case "Medium": return "text-sm";
      case "Large": return "text-base";
      case "Extra Large": return "text-lg";
      default: return "text-xs";
    }
  };

  // Example chapter and verse - Al-Fatiha
  const exampleChapter = chapters.find(ch => ch.id === 1);
  const exampleVerse = exampleVerses.length > 0 ? exampleVerses[0] : null;

  return (
    <div className="fixed inset-0 z-50 bg-background bg-screen-gradient">
      <div className="absolute inset-y-0 flex flex-col items-center justify-center overflow-y-auto app-fixed-x safe-area-pad">
        <div className="w-full px-8 py-6">
        {step === 0 && (
          <div className="text-center space-y-8 animate-fade-in">
            {/* Logo/Icon */}
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[hsl(var(--glow-primary)/0.20)] to-[hsl(var(--glow-accent)/0.15)] flex items-center justify-center backdrop-blur-xl border border-border/50">
                <Icon 
                  icon="mdi:book-open-page-variant" 
                  className="w-12 h-12 text-primary"
                />
              </div>
            </div>

            {/* Welcome Text */}
            <div className="space-y-4">
              <h1 className="font-heading text-5xl font-black tracking-tighter text-foreground">
                Tanzeel
              </h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Read, listen, and study the Holy Quran with translations, transliterations, and audio recitation
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-3 text-left max-w-sm mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[hsl(var(--glow-primary)/0.12)] flex items-center justify-center flex-shrink-0">
                  <Icon icon="mdi:text" className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-foreground">Multiple translations & transliterations</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[hsl(var(--glow-secondary)/0.12)] flex items-center justify-center flex-shrink-0">
                  <Icon icon="mdi:volume-high" className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-foreground">Beautiful audio recitation</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[hsl(var(--glow-accent)/0.12)] flex items-center justify-center flex-shrink-0">
                  <Icon icon="mdi:format-size" className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-foreground">Customizable text & display</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 bg-card/60 backdrop-blur-sm rounded-2xl px-5 py-4 border border-border/30">
              <div>
                <p className="text-sm font-medium text-foreground">Appearance</p>
                <p className="text-xs text-muted-foreground">{darkMode ? "Dark mode" : "Light mode"}</p>
              </div>
              <ThemeToggle isDark={darkMode} onToggle={onDarkModeChange} />
            </div>

            <div className="pt-4">
              <Button
                size="lg"
                className="w-full"
                onClick={() => setStep(1)}
                data-testid="button-onboarding-continue"
              >
                Get Started
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="font-heading text-3xl font-bold text-foreground">
                Customize Your Reading
              </h2>
              <p className="text-muted-foreground">
                Adjust text sizes for comfortable reading
              </p>
            </div>

            {/* Example Verse Preview */}
            {exampleVerse && (
              <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg">
                {/* Gradient border */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-border to-transparent" />
                
                {/* Inner glass panel */}
                <div className="relative rounded-3xl backdrop-blur-xl bg-card/95 p-6 space-y-4">
                  {/* Arabic Text */}
                  <p
                    className={`${getArabicFontSize(arabicFontSize)} font-arabic text-right text-foreground transition-all duration-300`}
                    dir="rtl"
                  >
                    {exampleVerse.arabicText}
                  </p>

                  {transliterationFontSize !== "Off" && (
                    <p className={`${getTransliterationFontSize(transliterationFontSize)} italic text-muted-foreground transition-all duration-300`}>
                      {exampleVerse.transliteration}
                    </p>
                  )}

                  {translationFontSize !== "Off" && (
                    <p className={`${getTranslationFontSize(translationFontSize)} text-foreground/90 transition-all duration-300`}>
                      {exampleVerse.translation}
                    </p>
                  )}

                  {/* Chapter Info */}
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      {exampleChapter?.englishName || "Al-Fatiha"} (Chapter {exampleChapter?.id || 1}, Verse 1)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Font Size Controls */}
            <div className="space-y-5">
              {/* Arabic Font Size */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Arabic Text Size</label>
                  <span className="text-xs text-muted-foreground">{arabicFontSize}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[{ label: "S", value: "Small" }, { label: "M", value: "Medium" }, { label: "L", value: "Large" }, { label: "XL", value: "Extra Large" }].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => onArabicFontSizeChange(opt.value)}
                      className={`py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                        arabicFontSize === opt.value
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover-elevate'
                      }`}
                      data-testid={`button-arabic-size-${opt.value.toLowerCase().replace(' ', '-')}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Translation */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Translation</label>
                  <span className="text-xs text-muted-foreground">
                    {translationFontSize}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => onTranslationFontSizeChange("Off")}
                    className={`py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                      translationFontSize === "Off"
                        ? 'bg-muted/60 ring-1 ring-inset ring-border text-foreground'
                        : 'bg-muted text-muted-foreground hover-elevate'
                    }`}
                    data-testid="button-translation-size-off"
                  >
                    Off
                  </button>
                  {[{ label: "S", value: "Small" }, { label: "M", value: "Medium" }, { label: "L", value: "Large" }].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => onTranslationFontSizeChange(opt.value)}
                      className={`py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                        translationFontSize === opt.value
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover-elevate'
                      }`}
                      data-testid={`button-translation-size-${opt.value.toLowerCase().replace(' ', '-')}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transliteration */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Transliteration</label>
                  <span className="text-xs text-muted-foreground">
                    {transliterationFontSize}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => onTransliterationFontSizeChange("Off")}
                    className={`py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                      transliterationFontSize === "Off"
                        ? 'bg-muted/60 ring-1 ring-inset ring-border text-foreground'
                        : 'bg-muted text-muted-foreground hover-elevate'
                    }`}
                    data-testid="button-transliteration-size-off"
                  >
                    Off
                  </button>
                  {[{ label: "S", value: "Small" }, { label: "M", value: "Medium" }, { label: "L", value: "Large" }].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => onTransliterationFontSizeChange(opt.value)}
                      className={`py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                        transliterationFontSize === opt.value
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover-elevate'
                      }`}
                      data-testid={`button-transliteration-size-${opt.value.toLowerCase().replace(' ', '-')}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setStep(0)}
                data-testid="button-onboarding-back"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                size="lg"
                onClick={onComplete}
                data-testid="button-onboarding-complete"
                className="flex-1"
              >
                Start Reading
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
