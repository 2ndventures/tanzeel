import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getChapterInfo, getChapterVerses } from "@/lib/quranData";

interface OnboardingScreenProps {
  onComplete: () => void;
  arabicFontSize: string;
  onArabicFontSizeChange: (value: string) => void;
  translationFontSize: string;
  onTranslationFontSizeChange: (value: string) => void;
  transliterationFontSize: string;
  onTransliterationFontSizeChange: (value: string) => void;
  darkMode: boolean;
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
}: OnboardingScreenProps) {
  const [step, setStep] = useState(0);

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

  const arabicSizeToSlider = (size: string): number => {
    switch(size) {
      case "Small": return 0;
      case "Medium": return 33;
      case "Large": return 66;
      case "Extra Large": return 100;
      default: return 66;
    }
  };

  const sliderToArabicSize = (value: number): string => {
    if (value <= 16) return "Small";
    if (value <= 49) return "Medium";
    if (value <= 83) return "Large";
    return "Extra Large";
  };

  const translationSizeToSlider = (size: string): number => {
    switch(size) {
      case "Small": return 0;
      case "Medium": return 50;
      case "Large": return 100;
      default: return 50;
    }
  };

  const sliderToTranslationSize = (value: number): string => {
    if (value <= 33) return "Small";
    if (value <= 66) return "Medium";
    return "Large";
  };

  const getTransliterationFontSize = (size: string) => {
    switch(size) {
      case "Small": return "text-xs";
      case "Medium": return "text-sm";
      case "Large": return "text-base";
      default: return "text-xs";
    }
  };

  const transliterationSizeToSlider = (size: string): number => {
    switch(size) {
      case "Small": return 0;
      case "Medium": return 50;
      case "Large": return 100;
      default: return 0;
    }
  };

  const sliderToTransliterationSize = (value: number): string => {
    if (value <= 33) return "Small";
    if (value <= 66) return "Medium";
    return "Large";
  };

  // Example verse - Al-Fatiha verse 1
  const exampleChapter = getChapterInfo(1);
  const exampleVerses = getChapterVerses(1);
  const exampleVerse = exampleVerses[0];

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
      {/* Multi-layer gradient background - adapts to theme */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg">
        {step === 0 && (
          <div className="text-center space-y-8 animate-fade-in">
            {/* Logo/Icon */}
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center backdrop-blur-xl border border-border/50">
                <Icon 
                  icon="mdi:book-open-page-variant" 
                  className="w-12 h-12 text-primary"
                />
              </div>
            </div>

            {/* Welcome Text */}
            <div className="space-y-4">
              <h1 className="font-heading text-5xl font-black tracking-tighter text-foreground">
                Simple Quran
              </h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Read, listen, and study the Holy Quran with translations, transliterations, and audio recitation
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-3 text-left max-w-sm mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon icon="mdi:text" className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-foreground">Multiple translations & transliterations</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon icon="mdi:volume-high" className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-foreground">Beautiful audio recitation</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon icon="mdi:format-size" className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-foreground">Customizable text & display</p>
              </div>
            </div>

            {/* Continue Button */}
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
                <div className="relative rounded-3xl backdrop-blur-xl bg-white/95 dark:bg-slate-900/70 p-6 space-y-4">
                  {/* Arabic Text */}
                  <p
                    className={`${getArabicFontSize(arabicFontSize)} font-arabic text-right text-foreground transition-all duration-300`}
                    dir="rtl"
                  >
                    {exampleVerse.arabicText}
                  </p>

                  {/* Transliteration */}
                  <p className={`${getTransliterationFontSize(transliterationFontSize)} italic text-muted-foreground transition-all duration-300`}>
                    {exampleVerse.transliteration}
                  </p>

                  {/* Translation */}
                  <p className={`${getTranslationFontSize(translationFontSize)} text-foreground/90 transition-all duration-300`}>
                    {exampleVerse.translation}
                  </p>

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
            <div className="space-y-6">
              {/* Arabic Font Size */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Arabic Text Size
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {arabicFontSize}
                  </span>
                </div>
                <Slider
                  value={[arabicSizeToSlider(arabicFontSize)]}
                  onValueChange={([value]) => onArabicFontSizeChange(sliderToArabicSize(value))}
                  max={100}
                  step={1}
                  className="w-full"
                  data-testid="slider-arabic-font-size"
                />
              </div>

              {/* Translation Font Size */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Translation Text Size
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {translationFontSize}
                  </span>
                </div>
                <Slider
                  value={[translationSizeToSlider(translationFontSize)]}
                  onValueChange={([value]) => onTranslationFontSizeChange(sliderToTranslationSize(value))}
                  max={100}
                  step={1}
                  className="w-full"
                  data-testid="slider-translation-font-size"
                />
              </div>

              {/* Transliteration Font Size */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Transliteration Text Size
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {transliterationFontSize}
                  </span>
                </div>
                <Slider
                  value={[transliterationSizeToSlider(transliterationFontSize)]}
                  onValueChange={([value]) => onTransliterationFontSizeChange(sliderToTransliterationSize(value))}
                  max={100}
                  step={1}
                  className="w-full"
                  data-testid="slider-transliteration-font-size"
                />
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
  );
}
