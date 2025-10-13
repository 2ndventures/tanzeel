import { ArrowLeft } from "lucide-react";
import SettingItem from "@/components/SettingItem";
import BottomNav from "@/components/BottomNav";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SettingsProps {
  onBack: () => void;
  darkMode: boolean;
  onDarkModeChange: (value: boolean) => void;
  transliteration: boolean;
  onTransliterationChange: (value: boolean) => void;
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
  translation: string;
  onTranslationChange: (value: string) => void;
}

export default function Settings({
  onBack,
  darkMode,
  onDarkModeChange,
  transliteration,
  onTransliterationChange,
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
  translation,
  onTranslationChange,
}: SettingsProps) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <button 
            className="p-2 hover-elevate active-elevate-2 rounded-md"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground" data-testid="text-title">Settings</h1>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-4 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Display</h2>
            <div className="space-y-1 divide-y divide-border">
              <SettingItem
                label="Theme"
                sublabel="Dark"
                type="toggle"
                value={darkMode}
                onToggle={onDarkModeChange}
                testId="toggle-theme"
              />
              <SettingItem
                label="Font"
                sublabel="System"
                type="select"
                value={font}
                options={[
                  { value: "System", label: "System" },
                  { value: "Amiri", label: "Amiri" },
                  { value: "Traditional", label: "Traditional" },
                ]}
                onSelect={onFontChange}
                testId="select-font"
              />
              <SettingItem
                label="Transliteration"
                sublabel="Off"
                type="toggle"
                value={transliteration}
                onToggle={onTransliterationChange}
                testId="toggle-transliteration"
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Audio</h2>
            <div className="space-y-1 divide-y divide-border">
              <SettingItem
                label="Reciter"
                sublabel="Mishary Rashid Alafasy"
                type="select"
                value={reciter}
                options={[
                  { value: "Alafasy", label: "Alafasy" },
                  { value: "Sudais", label: "Sudais" },
                  { value: "Ghamadi", label: "Ghamadi" },
                ]}
                onSelect={onReciterChange}
                testId="select-reciter"
              />
              <SettingItem
                label="Speed"
                sublabel="Normal"
                type="select"
                value={speed}
                options={[
                  { value: "Normal", label: "Normal" },
                  { value: "Fast", label: "Fast" },
                  { value: "Slow", label: "Slow" },
                ]}
                onSelect={onSpeedChange}
                testId="select-speed"
              />
              <SettingItem
                label="Auto-scroll"
                sublabel="Off"
                type="toggle"
                value={autoScroll}
                onToggle={onAutoScrollChange}
                testId="toggle-autoscroll"
              />
              <SettingItem
                label="Repeat"
                sublabel="Off"
                type="toggle"
                value={repeat}
                onToggle={onRepeatChange}
                testId="toggle-repeat"
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Content</h2>
            <div className="space-y-1 divide-y divide-border">
              <SettingItem
                label="Translations"
                sublabel="English"
                type="select"
                value={translation}
                options={[
                  { value: "English", label: "English" },
                  { value: "Urdu", label: "Urdu" },
                  { value: "French", label: "French" },
                ]}
                onSelect={onTranslationChange}
                testId="select-translation"
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      <BottomNav
        activeTab="settings"
        onTabChange={(tab) => {
          if (tab === "home" || tab === "surah") onBack();
        }}
      />
    </div>
  );
}
