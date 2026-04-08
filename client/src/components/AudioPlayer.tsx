import { useState, useRef, useCallback, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Slider } from "@/components/ui/slider";
import { X } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import type { LayoutMode } from "@/lib/quranMetadata";

import layoutStandardImg from "@/assets/images/layout-standard.png";
import layoutFocusedImg from "@/assets/images/layout-focused.png";
import layoutMushafImg from "@/assets/images/layout-mushaf.png";
import layoutStandardLightImg from "@/assets/images/layout-standard-light.png";
import layoutFocusedLightImg from "@/assets/images/layout-focused-light.png";
import layoutMushafLightImg from "@/assets/images/layout-mushaf-light.png";

const LAYOUT_OPTIONS: { mode: LayoutMode; icon: string; label: string; desc: string; previewDark: string; previewLight: string }[] = [
  { mode: 'standard', icon: 'solar:align-vertical-spacing-bold', label: 'Standard', desc: 'Vertical scrolling', previewDark: layoutStandardImg, previewLight: layoutStandardLightImg },
  { mode: 'focused-flow', icon: 'solar:book-2-bold', label: 'Focused Flow', desc: 'Vertical reading', previewDark: layoutFocusedImg, previewLight: layoutFocusedLightImg },
  { mode: 'mushaf', icon: 'solar:notebook-bold', label: 'Classic Mushaf', desc: 'Medinan page view', previewDark: layoutMushafImg, previewLight: layoutMushafLightImg },
];

interface VerseTimingInfo {
  timestamp_from: number;
  timestamp_to: number;
  verse_key: string;
}

interface AudioPlayerProps {
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  speed?: number;
  isLoading?: boolean;
  repeat?: boolean;
  onPlayPause?: () => void;
  onSeek?: (time: number) => void;
  onSpeedChange?: (speed: number) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onRepeatChange?: (enabled: boolean) => void;
  surahNumber?: number;
  surahNameArabic?: string;
  surahNameEnglish?: string;
  reciterName?: string;
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
  compact?: boolean;
  verseTimings?: VerseTimingInfo[];
  error?: string | null;
  onRetry?: () => void;
}

function LayoutDrawerContent({ layoutMode, onLayoutModeChange }: { layoutMode: LayoutMode; onLayoutModeChange?: (mode: LayoutMode) => void }) {
  const isDark = document.documentElement.classList.contains('dark');
  return (
    <DrawerContent className="overflow-hidden" style={{ backgroundColor: 'hsl(var(--sheet-bg))' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--glow-primary)/0.10)] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[hsl(var(--glow-primary)/0.12)] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[hsl(var(--glow-accent)/0.08)] via-transparent to-transparent" />
      </div>
      <DrawerClose className="z-50 rounded-full size-10 flex items-center justify-center bg-muted/60 ring-1 ring-border shadow-md transition-opacity opacity-80 hover:opacity-100 active:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-events-auto" style={{ position: 'absolute', right: '1rem', top: '1rem' }}>
        <X className="h-5 w-5 text-foreground" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} />
        <span className="sr-only">Close</span>
      </DrawerClose>
      <DrawerHeader className="relative z-10">
        <DrawerTitle>Select Layout</DrawerTitle>
      </DrawerHeader>
      <div className="px-4 pb-8 relative z-10">
        <div className="grid grid-cols-2 gap-3">
          {LAYOUT_OPTIONS.map((opt) => {
            const isSelected = layoutMode === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => { triggerHaptic('light'); onLayoutModeChange?.(opt.mode); }}
                className={`relative rounded-xl overflow-hidden transition-all ${
                  isSelected
                    ? 'ring-2 ring-primary shadow-md shadow-primary/15'
                    : 'ring-1 ring-border/40 dark:ring-white/8'
                }`}
                data-testid={`layout-option-${opt.mode}`}
              >
                <div className="aspect-square w-full overflow-hidden bg-muted/20">
                  <img
                    src={isDark ? opt.previewDark : opt.previewLight}
                    alt={`${opt.label} layout preview`}
                    className="w-full h-full object-cover"
                    data-testid={`img-layout-preview-${opt.mode}`}
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/10" />
                  )}
                </div>
                <div className={`px-3 py-2.5 text-left ${
                  isSelected
                    ? 'bg-primary/10 dark:bg-primary/15'
                    : 'bg-muted/30'
                }`}>
                  <p className={`text-sm font-semibold truncate ${
                    isSelected ? 'text-primary' : 'text-foreground dark:text-white/90'
                  }`} data-testid={`text-layout-label-${opt.mode}`}>{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground dark:text-white/45 truncate" data-testid={`text-layout-desc-${opt.mode}`}>{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </DrawerContent>
  );
}

export default function AudioPlayer({
  currentTime = 0,
  duration = 205,
  isPlaying = false,
  speed = 1.0,
  isLoading = false,
  repeat = false,
  onPlayPause,
  onSeek,
  onSpeedChange,
  onPrevious,
  onNext,
  onRepeatChange,
  surahNumber,
  surahNameArabic,
  surahNameEnglish,
  reciterName,
  layoutMode = 'standard',
  onLayoutModeChange,
  compact = false,
  verseTimings,
  error = null,
  onRetry,
}: AudioPlayerProps) {
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  const [showSpeedSlider, setShowSpeedSlider] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);
  const speedButtonRef = useRef<HTMLButtonElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  const isScrubbingRef = useRef(false);

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isScrubbingRef.current) {
        isScrubbingRef.current = false;
        setIsScrubbing(false);
      }
    };
    document.addEventListener('pointerup', handleGlobalPointerUp);
    document.addEventListener('touchend', handleGlobalPointerUp);
    return () => {
      document.removeEventListener('pointerup', handleGlobalPointerUp);
      document.removeEventListener('touchend', handleGlobalPointerUp);
    };
  }, []);

  const getVerseAtTime = useCallback((timeSeconds: number): string | null => {
    if (!verseTimings || verseTimings.length === 0) return null;
    const timeMs = timeSeconds * 1000;
    for (const timing of verseTimings) {
      if (timeMs >= timing.timestamp_from && timeMs <= timing.timestamp_to) {
        const verseNum = timing.verse_key.split(':')[1];
        return `Ayah ${verseNum}`;
      }
    }
    return null;
  }, [verseTimings]);

  // Auto-hide logic
  const [isVisible, setIsVisible] = useState(true);
  const visibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldAutoHide = layoutMode === 'focused-flow';

  const resetVisibilityTimer = useCallback(() => {
    setIsVisible(true);
    if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current);
    if (shouldAutoHide) {
      visibilityTimeoutRef.current = setTimeout(() => setIsVisible(false), 3000);
    }
  }, [shouldAutoHide]);

  useEffect(() => {
    if (shouldAutoHide) {
      resetVisibilityTimer();
    } else {
      setIsVisible(true);
      if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current);
    }
    return () => { if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current); };
  }, [shouldAutoHide]);

  useEffect(() => {
    if (!shouldAutoHide) return;
    const handleInteraction = () => resetVisibilityTimer();
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('click', handleInteraction);
    window.addEventListener('mousemove', handleInteraction);
    return () => {
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('mousemove', handleInteraction);
    };
  }, [shouldAutoHide, resetVisibilityTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSpeed = (s: number) => {
    return s % 1 === 0 ? `${s.toFixed(0)}x` : `${parseFloat(s.toFixed(1))}x`;
  };

  const speedIsModified = Math.abs(speed - 1.0) > 0.01;

  const cycleSpeed = () => {
    triggerHaptic('light');
    const currentIndex = speedOptions.findIndex(s => Math.abs(s - speed) < 0.01);
    if (currentIndex >= 0) {
      const nextIndex = (currentIndex + 1) % speedOptions.length;
      onSpeedChange?.(speedOptions[nextIndex]);
    } else {
      const next = speedOptions.find(s => s > speed + 0.01) ?? speedOptions[0];
      onSpeedChange?.(next);
    }
  };

  const handlePointerDown = useCallback(() => {
    didLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      setShowSpeedSlider(true);
    }, 400);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    if (!didLongPressRef.current) {
      if (showSpeedSlider) { setShowSpeedSlider(false); } else { cycleSpeed(); }
    }
  }, [speed, onSpeedChange, showSpeedSlider]);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  }, []);

  useEffect(() => {
    if (!showSpeedSlider) return;
    const handleClickOutside = (e: PointerEvent) => {
      const container = sliderContainerRef.current;
      const btn = speedButtonRef.current;
      if (container && !container.contains(e.target as Node) && btn && !btn.contains(e.target as Node)) {
        setShowSpeedSlider(false);
      }
    };
    const timeout = setTimeout(() => document.addEventListener('pointerdown', handleClickOutside), 50);
    return () => { clearTimeout(timeout); document.removeEventListener('pointerdown', handleClickOutside); };
  }, [showSpeedSlider]);

  // ── Compact mode ──
  if (compact) {
    const progressFraction = duration > 0 ? currentTime / duration : 0;
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progressFraction);

    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <Drawer>
          <DrawerTrigger asChild>
            <button
              className="size-10 rounded-full bg-card/95 backdrop-blur-2xl shadow-lg flex items-center justify-center ring-1 ring-border/40 text-primary"
              aria-label="Select layout mode"
              data-testid="compact-layout-button"
            >
              <Icon icon="solar:layers-minimalistic-bold" className="size-4" />
            </button>
          </DrawerTrigger>
          <LayoutDrawerContent layoutMode={layoutMode} onLayoutModeChange={onLayoutModeChange} />
        </Drawer>
        <button
          className={`size-14 rounded-full bg-card/95 backdrop-blur-2xl shadow-lg flex items-center justify-center ring-1 disabled:opacity-50 relative ${error ? 'ring-destructive/60' : 'ring-border/40'}`}
          onClick={() => { triggerHaptic('light'); error && onRetry ? onRetry() : onPlayPause?.(); }}
          disabled={isLoading}
          aria-label={error ? "Retry audio" : isLoading ? "Loading audio" : isPlaying ? "Pause audio" : "Play audio"}
          data-testid="compact-play-button"
        >
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="3" opacity="0.3" />
            <circle cx="28" cy="28" r={radius} fill="none" stroke={error ? "hsl(var(--destructive))" : "hsl(var(--glow-primary))"} strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`progress-ring-arc ${!error && strokeDashoffset < circumference ? 'progress-ring-glow-arc' : ''}`} />
          </svg>
          {error ? (
            <Icon icon="solar:refresh-bold" className="size-5 text-destructive relative z-10" />
          ) : isLoading ? (
            <div className="size-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Icon icon="solar:pause-bold" className="size-5 text-foreground relative z-10" />
          ) : (
            <Icon icon="solar:play-bold" className="size-5 text-foreground ml-0.5 relative z-10" />
          )}
        </button>
      </div>
    );
  }

  // ── Full player ──
  // Guard against stale currentTime during chapter transitions (when duration resets to 0 first)
  const safeCurrentTime = duration > 0 ? Math.min(currentTime, duration) : 0;
  const remaining = Math.max(0, duration - safeCurrentTime);

  return (
    <div className={`fixed inset-x-0 bottom-0 z-20 transition-all duration-300 ${
      !isVisible ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
    }`} data-testid="audio-player-wrapper" style={{ willChange: 'transform' }}>
      <div className="relative" data-testid="audio-player-content">
        {/* Frosted glass: backdrop-blur + gradient from transparent to bg color */}
        <div className="absolute inset-0 [-webkit-backdrop-filter:blur(40px)_saturate(180%)] [backdrop-filter:blur(40px)_saturate(180%)]" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(var(--player-gradient-rgb),0.15) 10%, rgba(var(--player-gradient-rgb),0.4) 25%, rgba(var(--player-gradient-rgb),0.7) 45%, rgba(var(--player-gradient-rgb),0.9) 70%, rgba(var(--player-gradient-rgb),0.98) 100%)' }} />

        <div className="relative px-6 pt-10 pb-5 safe-area-bottom">

        {/* ── Surah info: bold name left, Arabic right ── */}
        <div className="flex items-end justify-between mb-4 px-1" data-testid="surah-info">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h2 className="text-lg font-bold text-foreground dark:text-white/95 tracking-tight truncate" data-testid="text-surah-english">
              {surahNumber ? `${surahNumber}. ` : ''}{surahNameEnglish || 'Al-Fatihah'}
            </h2>
            {reciterName && (
              <p className="text-xs font-medium text-muted-foreground dark:text-white/50 truncate" data-testid="text-reciter-name">
                {reciterName}
              </p>
            )}
          </div>
          {surahNameArabic && (
            <span className="font-arabic text-lg text-muted-foreground/60 dark:text-white/40 shrink-0 ml-4" data-testid="text-surah-arabic">
              {surahNameArabic}
            </span>
          )}
        </div>

        {/* ── Seek bar ── */}
        <div className="mb-1">
          <Slider
            value={[isScrubbing ? scrubValue : safeCurrentTime]}
            max={duration || 1}
            step={0.1}
            onValueChange={(value) => {
              if (!isScrubbing) setIsScrubbing(true);
              isScrubbingRef.current = true;
              setScrubValue(value[0]);
            }}
            onValueCommit={(value) => {
              onSeek?.(value[0]);
              isScrubbingRef.current = false;
              setIsScrubbing(false);
            }}
            showTooltip={true}
            tooltipContent={(value) => {
              const verse = getVerseAtTime(value);
              return verse || formatTime(value);
            }}
            className="w-full [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-range]]:bg-foreground/70 dark:[&_[data-slot=slider-range]]:bg-white/80 [&_[data-slot=slider-track]]:bg-foreground/15 dark:[&_[data-slot=slider-track]]:bg-white/20 [&_[data-slot=slider-thumb]]:bg-foreground dark:[&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-foreground/20 dark:[&_[data-slot=slider-thumb]]:border-white/20"
            data-testid="slider-audio-progress"
          />
          <div className="flex items-center justify-between mt-1.5 px-0.5">
            <span className="text-[11px] tabular-nums font-medium text-muted-foreground dark:text-white/50" data-testid="text-current-time">
              {formatTime(isScrubbing ? scrubValue : safeCurrentTime)}
            </span>
            <span className="text-[11px] tabular-nums font-medium text-muted-foreground dark:text-white/50" data-testid="text-duration">
              -{formatTime(isScrubbing ? Math.max(0, duration - scrubValue) : remaining)}
            </span>
          </div>
        </div>

        {/* ── Speed slider panel (long-press) ── */}
        {showSpeedSlider && (
          <div
            ref={sliderContainerRef}
            className="rounded-2xl bg-black/5 dark:bg-white/10 ring-1 ring-black/10 dark:ring-white/10 p-4 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
            data-testid="speed-slider-panel"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground dark:text-white/50 uppercase tracking-wide">Speed</span>
              <button onClick={() => onSpeedChange?.(1.0)} className="text-xs text-foreground/80 dark:text-white/80 font-semibold px-2 py-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                Reset
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground/60 dark:text-white/40 w-8 text-right shrink-0">0.5x</span>
              <Slider
                value={[speed]} min={0.5} max={2.0} step={0.1}
                showTooltip tooltipContent={(v) => `${formatSpeed(v)}`}
                onValueChange={(value) => onSpeedChange?.(Math.round(value[0] * 10) / 10)}
                onValueCommit={() => { triggerHaptic('light'); setShowSpeedSlider(false); }}
                className="flex-1" aria-label="Fine playback speed" data-testid="slider-speed"
              />
              <span className="text-xs font-medium text-muted-foreground/60 dark:text-white/40 w-8 shrink-0">2x</span>
            </div>
            <div className="text-center mt-2">
              <span className="text-sm font-bold text-foreground/90 dark:text-white/90">{formatSpeed(speed)}</span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-center text-xs font-medium text-destructive dark:text-red-400 mt-2 mb-0 animate-in fade-in duration-200" data-testid="text-audio-error">
            {error}
          </p>
        )}

        {/* ── Controls row ── */}
        <div className="flex items-center justify-between mt-4 px-2">

          {/* Speed — plain text, gold when not 1x */}
          <button
            ref={speedButtonRef}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onContextMenu={(e) => e.preventDefault()}
            className={`min-h-[44px] w-10 flex items-center justify-center select-none touch-none rounded-xl transition-colors active:bg-black/[.13] dark:active:bg-white/[.15] ${
              speedIsModified ? 'text-[hsl(var(--glow-primary))]' : 'text-muted-foreground dark:text-white/50'
            }`}
            aria-label={`Playback speed ${formatSpeed(speed)}. Tap to cycle, hold for fine control`}
            data-testid="button-speed"
          >
            <span className="text-sm font-bold leading-none">
              {speed % 1 === 0 ? speed.toFixed(0) : parseFloat(speed.toFixed(1))}
              <span className="text-[10px] relative -top-0.5">x</span>
            </span>
          </button>

          {/* Center: skip back 15s, play/pause, skip forward 15s */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => { if (!isLoading && duration > 0) onSeek?.(Math.max(0, safeCurrentTime - 15)); }}
              disabled={isLoading || duration === 0}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-foreground/80 dark:text-white/80 rounded-xl active:bg-black/[.13] dark:active:bg-white/[.15] active:scale-95 transition-all disabled:opacity-40"
              aria-label="Skip back 15 seconds"
              data-testid="button-skip-back"
            >
              <Icon icon="solar:rewind-15-seconds-back-bold" className="size-8" aria-hidden="true" />
            </button>

            <button
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 active:brightness-90 transition-all disabled:opacity-50 ${error ? 'bg-destructive/90 text-destructive-foreground' : 'bg-[hsl(var(--glow-primary))] text-white'}`}
              onClick={() => { triggerHaptic('light'); error && onRetry ? onRetry() : onPlayPause?.(); }}
              disabled={isLoading}
              aria-label={error ? "Retry audio" : isLoading ? "Loading audio" : isPlaying ? "Pause audio" : "Play audio"}
              data-testid="button-play-pause"
            >
              {error ? (
                <Icon icon="solar:refresh-bold" className="size-7" aria-hidden="true" />
              ) : isLoading ? (
                <div className="size-6 border-[2.5px] border-white/80 border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" />
              ) : isPlaying ? (
                <Icon icon="solar:pause-bold" className="size-7 text-white" aria-hidden="true" />
              ) : (
                <Icon icon="solar:play-bold" className="size-7 text-white ml-0.5" aria-hidden="true" />
              )}
            </button>

            <button
              onClick={() => { if (!isLoading && duration > 0) onSeek?.(Math.min(duration, safeCurrentTime + 15)); }}
              disabled={isLoading || duration === 0}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-foreground/80 dark:text-white/80 rounded-xl active:bg-black/[.13] dark:active:bg-white/[.15] active:scale-95 transition-all disabled:opacity-40"
              aria-label="Skip forward 15 seconds"
              data-testid="button-skip-forward"
            >
              <Icon icon="solar:rewind-15-seconds-forward-bold" className="size-8" aria-hidden="true" />
            </button>
          </div>

          {/* Right: layout drawer */}
          <Drawer>
            <DrawerTrigger asChild>
              <button
                className={`min-h-[44px] w-10 flex items-center justify-center rounded-xl transition-colors active:bg-black/[.13] dark:active:bg-white/[.15] ${
                  layoutMode !== 'standard' ? 'text-foreground/90 dark:text-white/90' : 'text-muted-foreground dark:text-white/50'
                }`}
                aria-label="Select layout mode"
                data-testid="button-layout"
              >
                <Icon icon="solar:layers-minimalistic-bold" className="size-6" aria-hidden="true" />
              </button>
            </DrawerTrigger>
            <LayoutDrawerContent layoutMode={layoutMode} onLayoutModeChange={onLayoutModeChange} />
          </Drawer>
        </div>
      </div>
      </div>
    </div>
  );
}
