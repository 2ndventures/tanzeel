import { useState } from "react";
import { Icon } from "@iconify/react";
import SettingItem from "@/components/SettingItem";
import BottomNav from "@/components/BottomNav";
import { StatusBarShim } from "@/components/StatusBarShim";
import { getAllReciters, getReciterDisplayName } from "@/lib/reciters";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

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

  // Feedback form state
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      // Using Formspree for feedback submission
      const response = await fetch("https://formspree.io/f/xbljowyl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: feedback,
          _subject: "Simple Quran - User Feedback",
        }),
      });

      if (response.ok) {
        toast({
          title: "Feedback sent!",
          description: "Thank you for helping us improve Simple Quran.",
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background/95 to-background pb-24">
      {/* Multi-layer gradient background - adapts to theme */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Status Bar Shim */}
      <StatusBarShim />

      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border header-safe-padding">
        <div className="px-8 pt-4 pb-6">
          <h1 className="font-heading text-5xl font-black tracking-tighter text-foreground" style={{textShadow: '0 2px 8px rgba(0,0,0,0.1)'}} data-testid="text-title">
            Settings
          </h1>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="relative h-screen overflow-y-auto pt-[180px]">
        <div className="px-8 space-y-8 pb-24">
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

          {/* Help Section */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Help</h2>
            <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg">
              {/* Gradient border */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-border to-transparent" />
              
              {/* Inner glass panel */}
              <div className="relative overflow-visible rounded-3xl backdrop-blur-xl bg-white/95 dark:bg-slate-900/70 divide-y divide-border">
                <Sheet open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                  <SheetTrigger asChild>
                    <button
                      className="w-full flex items-center justify-between p-6 hover-elevate active-elevate-2 text-left"
                      data-testid="button-give-feedback"
                    >
                      <div>
                        <div className="text-lg text-foreground">Give Feedback</div>
                        <div className="text-sm text-muted-foreground mt-1">Share your thoughts with us</div>
                      </div>
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
                    <SheetHeader>
                      <SheetTitle className="text-2xl font-bold">Send Feedback</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <p className="text-muted-foreground">
                        We'd love to hear your thoughts! Your feedback helps us make Simple Quran better.
                      </p>
                      <Textarea
                        placeholder="Tell us what you think..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="min-h-[200px] resize-none text-base"
                        disabled={isSubmitting}
                        data-testid="textarea-feedback"
                      />
                      <div className="flex gap-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setFeedbackOpen(false)}
                          className="flex-1"
                          disabled={isSubmitting}
                          data-testid="button-cancel-feedback"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleFeedbackSubmit}
                          className="flex-1"
                          disabled={isSubmitting}
                          data-testid="button-submit-feedback"
                        >
                          {isSubmitting ? "Sending..." : "Send Feedback"}
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
                
                <button
                  onClick={() => {
                    localStorage.removeItem('onboardingCompleted');
                    window.location.reload();
                  }}
                  className="w-full flex items-center justify-between p-6 hover-elevate active-elevate-2 text-left"
                  data-testid="button-restart-onboarding"
                >
                  <div>
                    <div className="text-lg text-foreground">Restart Tutorial</div>
                    <div className="text-sm text-muted-foreground mt-1">View the welcome guide again</div>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Legal Section */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Legal</h2>
            <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg">
              {/* Gradient border */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-border to-transparent" />
              
              {/* Inner glass panel */}
              <div className="relative overflow-visible rounded-3xl backdrop-blur-xl bg-white/95 dark:bg-slate-900/70 divide-y divide-border">
                <button
                  onClick={() => onNavigate?.("privacy-policy")}
                  className="w-full flex items-center justify-between p-6 hover-elevate active-elevate-2 text-left"
                  data-testid="button-privacy-policy"
                >
                  <span className="text-lg text-foreground">Privacy Policy</span>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => onNavigate?.("terms-of-service")}
                  className="w-full flex items-center justify-between p-6 hover-elevate active-elevate-2 text-left"
                  data-testid="button-terms-of-service"
                >
                  <span className="text-lg text-foreground">Terms of Service</span>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* App Information */}
          <div className="text-center text-sm text-muted-foreground space-y-2 pb-8">
            <p>Simple Quran</p>
            <p>Version 1.0.0</p>
            <p>© 2025 Third Ventures, LLC</p>
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
