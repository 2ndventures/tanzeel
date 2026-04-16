import { useState, useEffect } from "react";
import { removeItem } from "@/lib/storage";
import { Icon } from "@iconify/react";

import { getAllReciters, getReciterById } from "@/lib/reciters";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { ChevronRight, ChevronLeft, Check, CircleOff } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getManifest } from "@/services/audioCache";

function getDownloadedSize(): number {
  const manifest = getManifest();
  if (!manifest) return 0;
  let total = 0;
  for (const entry of Object.values(manifest.files)) {
    if (entry.source === 'download') {
      total += entry.sizeBytes;
    }
  }
  return total;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB';
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

interface SettingsProps {
  onBack: () => void;
  onNavigate?: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings" | "bookmarks") => void;
  onRegisterBackHandler?: (handler: () => boolean) => void;
  darkMode: boolean;
  onDarkModeChange: (value: boolean) => void;
  arabicScript: 'uthmani' | 'indopak' | 'tajweed';
  onArabicScriptChange: (value: 'uthmani' | 'indopak' | 'tajweed') => void;
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

function PillRow({ label, value, options, onChange, testIdPrefix }: {
  label: string;
  value: string;
  options: { label?: string; icon?: React.ReactNode; value: string }[];
  onChange: (value: string) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="text-sm text-foreground/80 shrink-0">{label}</span>
      <div className="flex gap-1.5 overflow-x-auto flex-nowrap">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`shrink-0 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center justify-center ${
              opt.icon ? 'w-[30px] h-[30px] p-0' : 'px-3 py-1.5'
            } ${
              value === opt.value
                ? opt.value === 'Off'
                  ? 'bg-muted/60 ring-1 ring-inset ring-border text-foreground'
                  : 'bg-primary/20 ring-1 ring-inset ring-primary text-primary'
                : 'text-muted-foreground'
            }`}
            style={value !== opt.value ? { backgroundColor: 'hsl(var(--sheet-muted))' } : undefined}
            data-testid={`${testIdPrefix}-${opt.value.toLowerCase().replace(' ', '-')}`}
          >
            {opt.icon || opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({ label, sublabel, checked, onCheckedChange, testId, isThemeToggle }: {
  label: string;
  sublabel?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  testId: string;
  isThemeToggle?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 pr-4">
        <p className="text-sm text-foreground/80">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
      </div>
      {isThemeToggle ? (
        <ThemeToggle isDark={checked} onToggle={onCheckedChange} />
      ) : (
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} data-testid={testId} />
      )}
    </div>
  );
}

export default function Settings({
  onBack,
  onNavigate,
  onRegisterBackHandler,
  darkMode,
  onDarkModeChange,
  arabicScript,
  onArabicScriptChange,
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

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reciterView, setReciterView] = useState(false);
  const [scriptView, setScriptView] = useState(false);
  const [spacingView, setSpacingView] = useState(false);
  useEffect(() => {
    if (onRegisterBackHandler) {
      onRegisterBackHandler(() => {
        if (reciterView) {
          setReciterView(false);
          return true;
        }
        if (scriptView) {
          setScriptView(false);
          return true;
        }
        if (spacingView) {
          setSpacingView(false);
          return true;
        }
        return false;
      });
    }
  }, [onRegisterBackHandler, reciterView, scriptView, spacingView]);

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("https://formspree.io/f/xbljowyl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          message: feedback,
          _subject: "Tanzeel - User Feedback",
        }),
      });

      if (response.ok) {
        setFeedback("");
        setFeedbackOpen(false);
      }
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  if (reciterView) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-background via-background/95 to-background bg-screen-gradient">

        <div className="bg-background/95 backdrop-blur-xl border-b border-border header-safe-padding shrink-0 z-10">
          <div className="px-6 pt-4 pb-4 flex items-center gap-3">
            <button
              onClick={() => setReciterView(false)}
              className="flex size-10 items-center justify-center transition-colors active:opacity-60 shrink-0"
              data-testid="button-reciter-back"
            >
              <ChevronLeft className="w-5 h-5 text-foreground/80" />
            </button>
            <h1 className="text-xl font-semibold text-foreground" data-testid="text-reciter-title">
              Select Reciter
            </h1>
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto min-h-0 pb-nav-clearance">
          <div className="px-6 py-4 space-y-1">
            {allReciters.map((r) => {
              const isSelected = reciter === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    onReciterChange(r.id);
                    setReciterView(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors ${
                    isSelected ? 'bg-primary/15' : 'hover-elevate'
                  }`}
                  data-testid={`reciter-option-${r.id}`}
                >
                  <div className="text-left">
                    <p className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground/90'}`}>
                      {r.name}
                    </p>
                    {r.style && (
                      <p className="text-xs text-muted-foreground mt-0.5">{r.style}</p>
                    )}
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    );
  }

  const scriptLabels: Record<string, string> = { uthmani: 'Uthmani', indopak: 'IndoPak', tajweed: 'Tajweed' };
  const scriptOptions = [
    { value: 'uthmani', label: 'Uthmani', description: 'Standard Arabic script used in most printed Qurans' },
    { value: 'indopak', label: 'IndoPak', description: 'Nastaliq-style script common in South Asia' },
    { value: 'tajweed', label: 'Tajweed', description: 'Color-coded script highlighting tajweed rules' },
  ] as const;

  if (scriptView) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-background via-background/95 to-background bg-screen-gradient">

        <div className="bg-background/95 backdrop-blur-xl border-b border-border header-safe-padding shrink-0 z-10">
          <div className="px-6 pt-4 pb-4 flex items-center gap-3">
            <button
              onClick={() => setScriptView(false)}
              className="flex size-10 items-center justify-center transition-colors active:opacity-60 shrink-0"
              data-testid="button-script-back"
            >
              <ChevronLeft className="w-5 h-5 text-foreground/80" />
            </button>
            <h1 className="text-xl font-semibold text-foreground" data-testid="text-script-title">
              Arabic Script
            </h1>
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto min-h-0 pb-nav-clearance">
          <div className="px-6 py-4 space-y-1">
            {scriptOptions.map((option) => {
              const isSelected = arabicScript === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onArabicScriptChange(option.value);
                    setScriptView(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors ${
                    isSelected ? 'bg-primary/15' : 'hover-elevate'
                  }`}
                  data-testid={`script-option-${option.value}`}
                >
                  <div className="text-left">
                    <p className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground/90'}`}>
                      {option.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const spacingOptions = [
    { value: 'Compact', description: 'Minimal space between lines' },
    { value: 'Normal', description: 'Balanced line spacing' },
    { value: 'Relaxed', description: 'More room between lines' },
    { value: 'Loose', description: 'Maximum line spacing' },
  ];

  if (spacingView) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-background via-background/95 to-background bg-screen-gradient">

        <div className="bg-background/95 backdrop-blur-xl border-b border-border header-safe-padding shrink-0 z-10">
          <div className="px-6 pt-4 pb-4 flex items-center gap-3">
            <button
              onClick={() => setSpacingView(false)}
              className="flex size-10 items-center justify-center transition-colors active:opacity-60 shrink-0"
              data-testid="button-spacing-back"
            >
              <ChevronLeft className="w-5 h-5 text-foreground/80" />
            </button>
            <h1 className="text-xl font-semibold text-foreground" data-testid="text-spacing-title">
              Line Spacing
            </h1>
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto min-h-0 pb-nav-clearance">
          <div className="px-6 py-4 space-y-1">
            {spacingOptions.map((option) => {
              const isSelected = lineSpacing === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onLineSpacingChange(option.value);
                    setSpacingView(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors ${
                    isSelected ? 'bg-primary/15' : 'hover-elevate'
                  }`}
                  data-testid={`spacing-option-${option.value.toLowerCase()}`}
                >
                  <div className="text-left">
                    <p className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground/90'}`}>
                      {option.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background via-background/95 to-background bg-screen-gradient">

      <div className="bg-background/95 backdrop-blur-xl border-b border-border header-safe-padding shrink-0 z-10">
        <div className="px-6 pt-4 pb-6">
          <h1 className="font-heading text-5xl font-black tracking-tighter text-foreground" style={{textShadow: '0 2px 8px rgba(0,0,0,0.1)'}} data-testid="text-title">
            Settings
          </h1>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto min-h-0 pb-nav-clearance">
        <div className="px-6 space-y-7 py-6">

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-display">
              Display
            </h3>
            <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: 'hsl(var(--sheet-muted) / 0.4)', border: '1px solid hsl(var(--sheet-muted))' }}>
              <ToggleRow label="Theme" sublabel={darkMode ? "Dark" : "Light"} checked={darkMode} onCheckedChange={onDarkModeChange} testId="toggle-theme" isThemeToggle />
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <button
                onClick={() => setScriptView(true)}
                className="w-full flex items-center justify-between py-3 hover-elevate active-elevate-2 rounded-md"
                data-testid="menu-item-script"
              >
                <span className="text-sm text-foreground/80">Arabic Script</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{scriptLabels[arabicScript] || arabicScript}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <button
                onClick={() => setSpacingView(true)}
                className="w-full flex items-center justify-between py-3 hover-elevate active-elevate-2 rounded-md"
                data-testid="menu-item-spacing"
              >
                <span className="text-sm text-foreground/80">Line Spacing</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{lineSpacing}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <ToggleRow label="Verse numbers" checked={showVerseNumbers} onCheckedChange={onShowVerseNumbersChange} testId="toggle-verse-numbers" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-text-size">
              Text Size
            </h3>
            <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: 'hsl(var(--sheet-muted) / 0.4)', border: '1px solid hsl(var(--sheet-muted))' }}>
              <PillRow
                label="Arabic"
                value={arabicFontSize}
                options={[{ label: "S", value: "Small" }, { label: "M", value: "Medium" }, { label: "L", value: "Large" }, { label: "XL", value: "Extra Large" }]}
                onChange={onArabicFontSizeChange}
                testIdPrefix="button-arabic-size"
              />
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <PillRow
                label="Translation"
                value={translationFontSize}
                options={[{ icon: <CircleOff className="w-3.5 h-3.5" />, value: "Off" }, { label: "S", value: "Small" }, { label: "M", value: "Medium" }, { label: "L", value: "Large" }]}
                onChange={onTranslationFontSizeChange}
                testIdPrefix="button-translation-size"
              />
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <PillRow
                label="Transliteration"
                value={transliterationFontSize}
                options={[{ icon: <CircleOff className="w-3.5 h-3.5" />, value: "Off" }, { label: "S", value: "Small" }, { label: "M", value: "Medium" }, { label: "L", value: "Large" }]}
                onChange={onTransliterationFontSizeChange}
                testIdPrefix="button-transliteration-size"
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-audio">
              Audio
            </h3>
            <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: 'hsl(var(--sheet-muted) / 0.4)', border: '1px solid hsl(var(--sheet-muted))' }}>
              <button
                onClick={() => setReciterView(true)}
                className="w-full flex items-center justify-between py-3 hover-elevate active-elevate-2 rounded-md"
                data-testid="menu-item-reciter"
              >
                <span className="text-sm text-foreground/80">Reciter</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{getReciterById(reciter)?.name || 'Mishary Alafasy'}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <ToggleRow label="Auto-scroll" checked={autoScroll} onCheckedChange={onAutoScrollChange} testId="toggle-autoscroll" />
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <ToggleRow label="Autoplay next surah" checked={autoplay} onCheckedChange={onAutoplayChange} testId="toggle-autoplay" />
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <ToggleRow label="Repeat" checked={repeat} onCheckedChange={onRepeatChange} testId="toggle-repeat" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-storage">
              Offline Storage
            </h3>
            <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: 'hsl(var(--sheet-muted) / 0.4)', border: '1px solid hsl(var(--sheet-muted))' }}>
              <button
                onClick={() => onNavigate?.("audio-manager")}
                className="w-full flex items-center justify-between py-3 hover-elevate active-elevate-2 rounded-md text-left"
                data-testid="menu-item-audio-manager"
              >
                <div>
                  <p className="text-sm text-foreground/80">Audio Manager</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(getDownloadedSize())} downloaded
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-help">
              Help
            </h3>
            <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: 'hsl(var(--sheet-muted) / 0.4)', border: '1px solid hsl(var(--sheet-muted))' }}>
              <Sheet open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                <SheetTrigger asChild>
                  <button
                    className="w-full flex items-center justify-between py-3 hover-elevate active-elevate-2 text-left"
                    data-testid="button-give-feedback"
                  >
                    <div>
                      <p className="text-sm text-foreground/80">Give Feedback</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Share your thoughts with us</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[55vh] rounded-t-3xl overflow-hidden bg-screen-gradient" style={{ backgroundColor: 'hsl(var(--sheet-bg))', borderColor: 'hsl(var(--sheet-muted))' }}>
                  <SheetHeader className="relative z-10">
                    <SheetTitle className="text-xl font-semibold text-foreground">Send Feedback</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4 relative z-10">
                    <p className="text-sm text-muted-foreground">
                      We'd love to hear your thoughts! Your feedback helps us make Tanzeel better.
                    </p>
                    <Textarea
                      placeholder="Tell us what you think..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="min-h-[120px] resize-none text-base"
                      disabled={isSubmitting}
                      data-testid="textarea-feedback"
                    />
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setFeedbackOpen(false)}
                        className="flex-1 min-h-12"
                        disabled={isSubmitting}
                        data-testid="button-cancel-feedback"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleFeedbackSubmit}
                        className="flex-1 min-h-12"
                        disabled={isSubmitting}
                        data-testid="button-submit-feedback"
                      >
                        {isSubmitting ? "Sending..." : "Send Feedback"}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <button
                onClick={async () => {
                  await removeItem('onboardingCompleted');
                  window.location.reload();
                }}
                className="w-full flex items-center justify-between py-3 hover-elevate active-elevate-2 text-left"
                data-testid="button-restart-onboarding"
              >
                <div>
                  <p className="text-sm text-foreground/80">Restart Tutorial</p>
                  <p className="text-xs text-muted-foreground mt-0.5">View the welcome guide again</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-legal">
              Legal
            </h3>
            <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: 'hsl(var(--sheet-muted) / 0.4)', border: '1px solid hsl(var(--sheet-muted))' }}>
              <button
                onClick={() => onNavigate?.("privacy-policy")}
                className="w-full flex items-center justify-between py-3 hover-elevate active-elevate-2 text-left"
                data-testid="button-privacy-policy"
              >
                <span className="text-sm text-foreground/80">Privacy Policy</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <button
                onClick={() => onNavigate?.("terms-of-service")}
                className="w-full flex items-center justify-between py-3 hover-elevate active-elevate-2 text-left"
                data-testid="button-terms-of-service"
              >
                <span className="text-sm text-foreground/80">Terms of Service</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground/60 space-y-1 pb-8 pt-2">
            <p>Tanzeel</p>
            <p>Version 1.0.0</p>
            <p>2026 2nd Ventures, LLC</p>
          </div>
        </div>
      </div>

    </div>
  );
}
