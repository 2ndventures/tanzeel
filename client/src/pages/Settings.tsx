import { useState } from "react";
import { Icon } from "@iconify/react";
import BottomNav from "@/components/BottomNav";
import { StatusBarShim } from "@/components/StatusBarShim";
import { getAllReciters, getReciterById } from "@/lib/reciters";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, ChevronLeft, Check, Sun, Moon } from "lucide-react";

interface SettingsProps {
  onBack: () => void;
  onNavigate?: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings" | "bookmarks") => void;
  darkMode: boolean;
  onDarkModeChange: (value: boolean) => void;
  transliteration: boolean;
  onTransliterationChange: (value: boolean) => void;
  showTranslation: boolean;
  onShowTranslationChange: (value: boolean) => void;
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
  options: { label: string; value: string }[];
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
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              value === opt.value
                ? 'bg-primary/20 ring-1 ring-primary text-primary'
                : 'text-muted-foreground'
            }`}
            style={value !== opt.value ? { backgroundColor: 'hsl(var(--sheet-muted))' } : undefined}
            data-testid={`${testIdPrefix}-${opt.value.toLowerCase().replace(' ', '-')}`}
          >
            {opt.label}
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
        <div className="relative">
          <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} data-testid={testId} className="relative" />
          <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
            <Sun className="w-3.5 h-3.5 text-yellow-500" aria-hidden="true" />
            <Moon className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
          </div>
        </div>
      ) : (
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} data-testid={testId} />
      )}
    </div>
  );
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
  const { toast } = useToast();

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) {
      toast({
        title: "Please enter feedback",
        description: "Your feedback is important to us!",
        variant: "destructive",
      });
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
        toast({
          title: "Feedback sent!",
          description: "Thank you for helping us improve Tanzeel.",
        });
        setFeedback("");
        setFeedbackOpen(false);
      } else {
        throw new Error("Failed to send feedback");
      }
    } catch (error) {
      toast({
        title: "Failed to send feedback",
        description: "Please try again later or email us at support@thirdventures.com",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (reciterView) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background/95 to-background pb-24">
        <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background/95 to-background" />
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <StatusBarShim />

        <div className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border header-safe-padding">
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

        <div className="relative h-screen overflow-y-auto pt-[120px]">
          <div className="px-6 pb-24 space-y-1">
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

        <BottomNav
          activeTab="settings"
          onTabChange={(tab) => {
            if (onNavigate) {
              if (tab === "home") onNavigate("home", undefined, "home");
              else if (tab === "surah") onNavigate("surah-juz", undefined, "surah");
              else if (tab === "bookmarks") onNavigate("bookmarks", undefined, "bookmarks");
            } else {
              if (tab === "home" || tab === "surah") onBack();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background/95 to-background pb-24">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <StatusBarShim />

      <div className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border header-safe-padding">
        <div className="px-8 pt-4 pb-6">
          <h1 className="font-heading text-5xl font-black tracking-tighter text-foreground" style={{textShadow: '0 2px 8px rgba(0,0,0,0.1)'}} data-testid="text-title">
            Settings
          </h1>
        </div>
      </div>

      <div className="relative h-screen overflow-y-auto pt-[180px]">
        <div className="px-6 space-y-7 pb-24">

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-display">
              Display
            </h3>
            <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: 'hsl(var(--sheet-muted) / 0.4)', border: '1px solid hsl(var(--sheet-muted))' }}>
              <ToggleRow label="Theme" sublabel={darkMode ? "Dark" : "Light"} checked={darkMode} onCheckedChange={onDarkModeChange} testId="toggle-theme" isThemeToggle />
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <ToggleRow label="Translation" checked={showTranslation} onCheckedChange={onShowTranslationChange} testId="toggle-translation" />
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <ToggleRow label="Transliteration" checked={transliteration} onCheckedChange={onTransliterationChange} testId="toggle-transliteration" />
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
                options={[{ label: "S", value: "Small" }, { label: "M", value: "Medium" }, { label: "L", value: "Large" }]}
                onChange={onTranslationFontSizeChange}
                testIdPrefix="button-translation-size"
              />
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <PillRow
                label="Transliteration"
                value={transliterationFontSize}
                options={[{ label: "S", value: "Small" }, { label: "M", value: "Medium" }, { label: "L", value: "Large" }]}
                onChange={onTransliterationFontSizeChange}
                testIdPrefix="button-transliteration-size"
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-appearance">
              Appearance
            </h3>
            <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: 'hsl(var(--sheet-muted) / 0.4)', border: '1px solid hsl(var(--sheet-muted))' }}>
              <PillRow
                label="Arabic Script"
                value={arabicScript}
                options={[{ label: "Uthmani", value: "uthmani" }, { label: "IndoPak", value: "indopak" }, { label: "Tajweed", value: "tajweed" }]}
                onChange={(v) => onArabicScriptChange(v as 'uthmani' | 'indopak' | 'tajweed')}
                testIdPrefix="button-script"
              />
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <PillRow
                label="Line Spacing"
                value={lineSpacing}
                options={[{ label: "Compact", value: "Compact" }, { label: "Normal", value: "Normal" }, { label: "Relaxed", value: "Relaxed" }, { label: "Loose", value: "Loose" }]}
                onChange={onLineSpacingChange}
                testIdPrefix="button-spacing"
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
                <SheetContent side="bottom" className="h-[55vh] rounded-t-3xl" style={{ backgroundColor: 'hsl(var(--sheet-bg))', borderColor: 'hsl(var(--sheet-muted))' }}>
                  <SheetHeader>
                    <SheetTitle className="text-xl font-semibold text-foreground">Send Feedback</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
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
                onClick={() => {
                  localStorage.removeItem('onboardingCompleted');
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
            <p>2026 Third Ventures, LLC</p>
          </div>
        </div>
      </div>

      <BottomNav
        activeTab="settings"
        onTabChange={(tab) => {
          if (onNavigate) {
            if (tab === "home") onNavigate("home", undefined, "home");
            else if (tab === "surah") onNavigate("surah-juz", undefined, "surah");
            else if (tab === "bookmarks") onNavigate("bookmarks", undefined, "bookmarks");
          } else {
            if (tab === "home" || tab === "surah") onBack();
          }
        }}
      />
    </div>
  );
}
