import { Icon } from "@iconify/react";
import SettingItem from "@/components/SettingItem";
import BottomNav from "@/components/BottomNav";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  speed: string;
  onSpeedChange: (value: string) => void;
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
  speed,
  onSpeedChange,
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
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="flex items-center gap-4 p-5">
          <button 
            className="p-2 hover-elevate active-elevate-2 rounded-xl"
            onClick={onBack}
            data-testid="button-back"
          >
            <Icon icon="solar:alt-arrow-left-bold" className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight" data-testid="text-title">Settings</h1>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-5 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Display</h2>
            <div className="bg-card rounded-3xl shadow-lg border border-border overflow-hidden divide-y divide-border">
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

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Text Size</h2>
            <div className="bg-card rounded-3xl shadow-lg border border-border overflow-hidden divide-y divide-border">
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

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Audio</h2>
            <div className="bg-card rounded-3xl shadow-lg border border-border overflow-hidden divide-y divide-border">
              <SettingItem
                label="Reciter"
                type="select"
                value={reciter}
                options={reciterOptions}
                onSelect={onReciterChange}
                testId="select-reciter"
              />
              <SettingItem
                label="Speed"
                type="select"
                value={speed}
                options={[
                  { value: "Slow", label: "Slow" },
                  { value: "Normal", label: "Normal" },
                  { value: "Fast", label: "Fast" },
                ]}
                onSelect={onSpeedChange}
                testId="select-speed"
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
      </ScrollArea>

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
