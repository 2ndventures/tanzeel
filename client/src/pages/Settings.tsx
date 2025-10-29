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
    <div className="min-h-screen pb-32 relative overflow-hidden">
      {/* Multi-layer dark gradient background matching other pages */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950" />
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Glass header with premium treatment */}
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-slate-900/80 border-b border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/5" />
          <div className="relative flex items-center gap-4 p-5">
            <button 
              className="min-h-[48px] min-w-[48px] size-12 p-2 hover-elevate active-elevate-2 rounded-full bg-slate-800/60 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
              onClick={onBack}
              data-testid="button-back"
            >
              <Icon icon="solar:alt-arrow-left-bold" className="w-6 h-6 text-white" style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}} />
            </button>
            <h1 className="text-2xl font-bold text-white tracking-tight" data-testid="text-title" style={{textShadow: '0 4px 12px rgba(0,0,0,0.5)'}}>
              Settings
            </h1>
          </div>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-6 space-y-8">
          {/* Display Section */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4" style={{textShadow: '0 2px 8px rgba(0,0,0,0.4)'}}>Display</h2>
            <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
              {/* Gradient border */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent" />
              
              {/* Inner glass panel */}
              <div className="relative overflow-visible rounded-3xl backdrop-blur-xl bg-slate-900/70 divide-y divide-white/5">
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
            <h2 className="text-lg font-semibold text-white mb-4" style={{textShadow: '0 2px 8px rgba(0,0,0,0.4)'}}>Text Size</h2>
            <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
              {/* Gradient border */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent" />
              
              {/* Inner glass panel */}
              <div className="relative overflow-visible rounded-3xl backdrop-blur-xl bg-slate-900/70 divide-y divide-white/5">
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
            <h2 className="text-lg font-semibold text-white mb-4" style={{textShadow: '0 2px 8px rgba(0,0,0,0.4)'}}>Audio</h2>
            <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
              {/* Gradient border */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent" />
              
              {/* Inner glass panel */}
              <div className="relative overflow-visible rounded-3xl backdrop-blur-xl bg-slate-900/70 divide-y divide-white/5">
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
