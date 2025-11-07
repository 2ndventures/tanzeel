import { Icon } from "@iconify/react";
import SettingItem from "@/components/SettingItem";
import BottomNav from "@/components/BottomNav";
import { getAllReciters, getReciterDisplayName } from "@/lib/reciters";

interface SettingsProps {
  onBack: () => void;
  onNavigate?: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings") => void;
  darkMode: boolean;
  onDarkModeChange: (value: boolean) => void;
  transliteration: boolean;
  onTransliterationChange: (value: boolean) => void;
  showTranslation: boolean;
  onShowTranslationChange: (value: boolean) => void;
  font: string;
  onFontChange: (value: string) => void;
  reciter: string;
  onReciterChange: (value: string) => void;
  autoScroll: boolean;
  onAutoScrollChange: (value: boolean) => void;
  repeat: boolean;
  onRepeatChange: (value: boolean) => void;
  autoplay: boolean;
  onAutoplayChange: (value: boolean) => void;
  translation: string;
  onTranslationChange: (value: string) => void;
  arabicFontSize: string;
  onArabicFontSizeChange: (value: string) => void;
  translationFontSize: string;
  onTranslationFontSizeChange: (value: string) => void;
  transliterationFontSize: string;
  onTransliterationFontSizeChange: (value: string) => void;
  lineSpacing: string;
  onLineSpacingChange: (value: string) => void;
  showVerseNumbers: boolean;
  onShowVerseNumbersChange: (value: boolean) => void;
}

export default function Settings({
  onBack,
  onNavigate,
  darkMode,
  onDarkModeChange,
  transliteration,
  onTransliterationChange,
  showTranslation,
  onShowTranslationChange,
  font,
  onFontChange,
  reciter,
  onReciterChange,
  autoScroll,
  onAutoScrollChange,
  repeat,
  onRepeatChange,
  autoplay,
  onAutoplayChange,
  translation,
  onTranslationChange,
  arabicFontSize,
  onArabicFontSizeChange,
  translationFontSize,
  onTranslationFontSizeChange,
  transliterationFontSize,
  onTransliterationFontSizeChange,
  lineSpacing,
  onLineSpacingChange,
  showVerseNumbers,
  onShowVerseNumbersChange,
}: SettingsProps) {
  const allReciters = getAllReciters();
  const reciterOptions = allReciters.map(r => ({
    value: r.id,
    label: r.style ? `${r.name} - ${r.style}` : r.name,
  }));

  return (
    <div className="min-h-screen pb-32 relative overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Multi-layer gradient background - adapts to theme */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative px-8 pt-4 pb-6">
        <h1 className="font-heading text-5xl font-black tracking-tighter text-foreground mb-6" style={{textShadow: '0 2px 8px rgba(0,0,0,0.1)'}} data-testid="text-title">
          Settings
        </h1>
      </div>

      <div className="relative px-8 space-y-8 pb-24">
          {/* Display Section */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Display</h2>
            <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg">
              {/* Gradient border */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-border to-transparent" />
              
              {/* Inner glass panel */}
              <div className="relative overflow-visible rounded-3xl backdrop-blur-xl bg-white/95 dark:bg-slate-900/70 divide-y divide-border">
                <SettingItem
                  label="Theme"
                  sublabel={darkMode ? "Dark" : "Light"}
                  type="toggle"
                  value={darkMode}
                  onToggle={onDarkModeChange}
                  testId="toggle-theme"
                  isThemeToggle={true}
                />
                <SettingItem
                  label="Translation"
                  sublabel={showTranslation ? "On" : "Off"}
                  type="toggle"
                  value={showTranslation}
                  onToggle={onShowTranslationChange}
                  testId="toggle-translation"
                />
                <SettingItem
                  label="Transliteration"
                  sublabel={transliteration ? "On" : "Off"}
                  type="toggle"
                  value={transliteration}
                  onToggle={onTransliterationChange}
                  testId="toggle-transliteration"
                />
                <SettingItem
                  label="Verse numbers"
                  sublabel={showVerseNumbers ? "On" : "Off"}
                  type="toggle"
                  value={showVerseNumbers}
                  onToggle={onShowVerseNumbersChange}
                  testId="toggle-verse-numbers"
                />
              </div>
            </div>
          </div>

          {/* Text Size Section */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Text Size</h2>
            <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg">
              {/* Gradient border */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-border to-transparent" />
              
              {/* Inner glass panel */}
              <div className="relative overflow-visible rounded-3xl backdrop-blur-xl bg-white/95 dark:bg-slate-900/70 divide-y divide-border">
                <SettingItem
                  label="Arabic text"
                  type="select"
                  value={arabicFontSize}
                  options={[
                    { value: "Small", label: "Small" },
                    { value: "Medium", label: "Medium" },
                    { value: "Large", label: "Large" },
                    { value: "Extra Large", label: "Extra Large" },
                  ]}
                  onSelect={onArabicFontSizeChange}
                  testId="select-arabic-font-size"
                />
                <SettingItem
                  label="Translation text"
                  type="select"
                  value={translationFontSize}
                  options={[
                    { value: "Small", label: "Small" },
                    { value: "Medium", label: "Medium" },
                    { value: "Large", label: "Large" },
                  ]}
                  onSelect={onTranslationFontSizeChange}
                  testId="select-translation-font-size"
                />
                <SettingItem
                  label="Transliteration text"
                  type="select"
                  value={transliterationFontSize}
                  options={[
                    { value: "Small", label: "Small" },
                    { value: "Medium", label: "Medium" },
                    { value: "Large", label: "Large" },
                  ]}
                  onSelect={onTransliterationFontSizeChange}
                  testId="select-transliteration-font-size"
                />
                <SettingItem
                  label="Line spacing"
                  type="select"
                  value={lineSpacing}
                  options={[
                    { value: "Compact", label: "Compact" },
                    { value: "Normal", label: "Normal" },
                    { value: "Relaxed", label: "Relaxed" },
                    { value: "Loose", label: "Loose" },
                  ]}
                  onSelect={onLineSpacingChange}
                  testId="select-line-spacing"
                />
              </div>
            </div>
          </div>

          {/* Audio Section */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Audio</h2>
            <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg">
              {/* Gradient border */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-border to-transparent" />
              
              {/* Inner glass panel */}
              <div className="relative overflow-visible rounded-3xl backdrop-blur-xl bg-white/95 dark:bg-slate-900/70 divide-y divide-border">
                <SettingItem
                  label="Reciter"
                  type="select"
                  value={reciter}
                  options={reciterOptions}
                  onSelect={onReciterChange}
                  testId="select-reciter"
                />
                <SettingItem
                  label="Auto-scroll"
                  sublabel={autoScroll ? "On" : "Off"}
                  type="toggle"
                  value={autoScroll}
                  onToggle={onAutoScrollChange}
                  testId="toggle-autoscroll"
                />
                <SettingItem
                  label="Autoplay next surah"
                  sublabel={autoplay ? "On" : "Off"}
                  type="toggle"
                  value={autoplay}
                  onToggle={onAutoplayChange}
                  testId="toggle-autoplay"
                />
                <SettingItem
                  label="Repeat"
                  sublabel={repeat ? "On" : "Off"}
                  type="toggle"
                  value={repeat}
                  onToggle={onRepeatChange}
                  testId="toggle-repeat"
                />
              </div>
            </div>
          </div>
      </div>

      <BottomNav
        activeTab="settings"
        onTabChange={(tab) => {
          if (onNavigate) {
            if (tab === "home") {
              onNavigate("home", undefined, "home");
            } else if (tab === "surah") {
              onNavigate("surah-juz", undefined, "surah");
            }
          } else {
            if (tab === "home" || tab === "surah") onBack();
          }
        }}
      />
    </div>
  );
}
