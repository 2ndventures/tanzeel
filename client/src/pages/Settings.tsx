import { ArrowLeft } from "lucide-react";
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
}: SettingsProps) {
  const allReciters = getAllReciters();
  const reciterOptions = allReciters.map(r => ({
    value: r.id,
    label: r.style ? `${r.name} - ${r.style}` : r.name,
  }));

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
                sublabel={darkMode ? "Dark" : "Light"}
                type="toggle"
                value={darkMode}
                onToggle={onDarkModeChange}
                testId="toggle-theme"
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
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Audio</h2>
            <div className="space-y-1 divide-y divide-border">
              <SettingItem
                label="Reciter"
                sublabel={getReciterDisplayName(reciter)}
                type="select"
                value={reciter}
                options={reciterOptions}
                onSelect={onReciterChange}
                testId="select-reciter"
              />
              <SettingItem
                label="Speed"
                sublabel={speed}
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
