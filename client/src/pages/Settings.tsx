import { useState, useEffect, useCallback } from "react";
import { removeItem } from "@/lib/storage";
import { Icon } from "@iconify/react";

import { getAllReciters, getReciterById } from "@/lib/reciters";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getCacheOnlyStats, clearCache, getManifest } from "@/services/audioCache";

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

type SubViewType = 'reciter' | 'script' | 'spacing' | 'arabic-size' | 'translation-size' | 'transliteration-size' | null;

const subViewTitles: Record<string, string> = {
  reciter: 'Select Reciter',
  script: 'Arabic Script',
  spacing: 'Line Spacing',
  'arabic-size': 'Arabic Text Size',
  'translation-size': 'Translation Size',
  'transliteration-size': 'Transliteration Size',
};

function NavRow({ label, value, onClick, testId }: {
  label: string;
  value: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3 hover-elevate active-elevate-2 rounded-md"
      data-testid={testId}
    >
      <span className="text-sm text-foreground/80">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{value}</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );
}

function OptionList({ options, selectedValue, onSelect, testIdPrefix }: {
  options: { label: string; value: string; sublabel?: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="px-6 py-4 space-y-1">
      {options.map((opt) => {
        const isSelected = selectedValue === opt.value;
        const isOff = opt.value === 'Off';
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors ${
              isSelected
                ? isOff ? 'bg-destructive/15' : 'bg-primary/15'
                : 'hover-elevate'
            }`}
            data-testid={`${testIdPrefix}-${opt.value.toLowerCase().replace(' ', '-')}`}
          >
            <div className="text-left">
              <p className={`text-sm font-medium ${
                isSelected
                  ? isOff ? 'text-destructive' : 'text-primary'
                  : 'text-foreground/90'
              }`}>
                {opt.label}
              </p>
              {opt.sublabel && (
                <p className="text-xs text-muted-foreground mt-0.5">{opt.sublabel}</p>
              )}
            </div>
            {isSelected && <Check className={`w-5 h-5 shrink-0 ${isOff ? 'text-destructive' : 'text-primary'}`} />}
          </button>
        );
      })}
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
  const [subView, setSubView] = useState<SubViewType>(null);
  const [cacheStats, setCacheStats] = useState({ totalSizeBytes: 0, fileCount: 0 });
  const [isClearing, setIsClearing] = useState(false);

  const refreshCacheStats = useCallback(() => {
    setCacheStats(getCacheOnlyStats());
  }, []);

  useEffect(() => {
    refreshCacheStats();
  }, [refreshCacheStats]);
  useEffect(() => {
    if (onRegisterBackHandler) {
      onRegisterBackHandler(() => {
        if (subView) {
          setSubView(null);
          return true;
        }
        return false;
      });
    }
  }, [onRegisterBackHandler, subView]);

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

  if (subView) {
    const renderSubViewContent = () => {
      switch (subView) {
        case 'reciter':
          return (
            <div className="px-6 py-4 space-y-1">
              {allReciters.map((r) => {
                const isSelected = reciter === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      onReciterChange(r.id);
                      setSubView(null);
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
          );
        case 'script':
          return (
            <OptionList
              options={[
                { label: 'Uthmani', value: 'uthmani' },
                { label: 'IndoPak', value: 'indopak' },
                { label: 'Tajweed', value: 'tajweed' },
              ]}
              selectedValue={arabicScript}
              onSelect={(v) => { onArabicScriptChange(v as 'uthmani' | 'indopak' | 'tajweed'); setSubView(null); }}
              testIdPrefix="button-script"
            />
          );
        case 'spacing':
          return (
            <OptionList
              options={[
                { label: 'Compact', value: 'Compact' },
                { label: 'Normal', value: 'Normal' },
                { label: 'Relaxed', value: 'Relaxed' },
                { label: 'Loose', value: 'Loose' },
              ]}
              selectedValue={lineSpacing}
              onSelect={(v) => { onLineSpacingChange(v); setSubView(null); }}
              testIdPrefix="button-spacing"
            />
          );
        case 'arabic-size':
          return (
            <OptionList
              options={[
                { label: 'Small', value: 'Small' },
                { label: 'Medium', value: 'Medium' },
                { label: 'Large', value: 'Large' },
                { label: 'Extra Large', value: 'Extra Large' },
              ]}
              selectedValue={arabicFontSize}
              onSelect={(v) => { onArabicFontSizeChange(v); setSubView(null); }}
              testIdPrefix="button-arabic-size"
            />
          );
        case 'translation-size':
          return (
            <OptionList
              options={[
                { label: 'Off', value: 'Off' },
                { label: 'Small', value: 'Small' },
                { label: 'Medium', value: 'Medium' },
                { label: 'Large', value: 'Large' },
              ]}
              selectedValue={translationFontSize}
              onSelect={(v) => { onTranslationFontSizeChange(v); setSubView(null); }}
              testIdPrefix="button-translation-size"
            />
          );
        case 'transliteration-size':
          return (
            <OptionList
              options={[
                { label: 'Off', value: 'Off' },
                { label: 'Small', value: 'Small' },
                { label: 'Medium', value: 'Medium' },
                { label: 'Large', value: 'Large' },
              ]}
              selectedValue={transliterationFontSize}
              onSelect={(v) => { onTransliterationFontSizeChange(v); setSubView(null); }}
              testIdPrefix="button-transliteration-size"
            />
          );
        default:
          return null;
      }
    };

    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-background via-background/95 to-background">
        <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background/95 to-background" />
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[hsl(var(--glow-primary)/0.08)] rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[hsl(var(--glow-accent)/0.06)] rounded-full blur-3xl" />
        </div>

        <div className="bg-background/95 backdrop-blur-xl border-b border-border header-safe-padding shrink-0 z-10">
          <div className="px-6 pt-4 pb-4 flex items-center gap-3">
            <button
              onClick={() => setSubView(null)}
              className="flex size-10 items-center justify-center transition-colors active:opacity-60 shrink-0"
              data-testid="button-subview-back"
            >
              <ChevronLeft className="w-5 h-5 text-foreground/80" />
            </button>
            <h1 className="text-xl font-semibold text-foreground" data-testid="text-subview-title">
              {subViewTitles[subView] || ''}
            </h1>
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto min-h-0 pb-nav-clearance">
          {renderSubViewContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background via-background/95 to-background">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[hsl(var(--glow-primary)/0.08)] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[hsl(var(--glow-accent)/0.06)] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[hsl(var(--glow-secondary)/0.05)] rounded-full blur-3xl" />
      </div>

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
              <NavRow label="Arabic Script" value={arabicScript === 'uthmani' ? 'Uthmani' : arabicScript === 'indopak' ? 'IndoPak' : 'Tajweed'} onClick={() => setSubView('script')} testId="menu-item-script" />
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <NavRow label="Line Spacing" value={lineSpacing} onClick={() => setSubView('spacing')} testId="menu-item-spacing" />
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <ToggleRow label="Verse numbers" checked={showVerseNumbers} onCheckedChange={onShowVerseNumbersChange} testId="toggle-verse-numbers" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-text-size">
              Text Size
            </h3>
            <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: 'hsl(var(--sheet-muted) / 0.4)', border: '1px solid hsl(var(--sheet-muted))' }}>
              <NavRow label="Arabic" value={arabicFontSize} onClick={() => setSubView('arabic-size')} testId="menu-item-arabic-size" />
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <NavRow label="Translation" value={translationFontSize} onClick={() => setSubView('translation-size')} testId="menu-item-translation-size" />
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <NavRow label="Transliteration" value={transliterationFontSize} onClick={() => setSubView('transliteration-size')} testId="menu-item-transliteration-size" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide mb-3" data-testid="section-audio">
              Audio
            </h3>
            <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: 'hsl(var(--sheet-muted) / 0.4)', border: '1px solid hsl(var(--sheet-muted))' }}>
              <NavRow label="Reciter" value={getReciterById(reciter)?.name || 'Mishary Alafasy'} onClick={() => setSubView('reciter')} testId="menu-item-reciter" />
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
              <div className="border-t" style={{ borderColor: 'hsl(var(--sheet-muted))' }} />
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-foreground/80">Audio Cache</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(cacheStats.totalSizeBytes)} used
                  </p>
                </div>
                {cacheStats.fileCount > 0 ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="text-xs text-destructive hover-elevate active-elevate-2 rounded-md px-2 py-1"
                        disabled={isClearing}
                        data-testid="button-clear-cache"
                      >
                        {isClearing ? "Clearing..." : "Clear"}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Audio Cache</AlertDialogTitle>
                        <AlertDialogDescription>
                          Clear all cached audio? You'll need an internet connection to listen again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-clear-cache">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            setIsClearing(true);
                            try {
                              await clearCache();
                              refreshCacheStats();
                            } finally {
                              setIsClearing(false);
                            }
                          }}
                          data-testid="button-confirm-clear-cache"
                        >
                          Clear Cache
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <span className="text-xs text-muted-foreground/50" data-testid="text-cache-usage">Empty</span>
                )}
              </div>
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
                <SheetContent side="bottom" className="h-[55vh] rounded-t-3xl overflow-hidden" style={{ backgroundColor: 'hsl(var(--sheet-bg))', borderColor: 'hsl(var(--sheet-muted))' }}>
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--glow-primary)/0.10)] via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[hsl(var(--glow-primary)/0.12)] via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[hsl(var(--glow-accent)/0.08)] via-transparent to-transparent" />
                  </div>
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
