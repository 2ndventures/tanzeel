import { useState, useRef, useCallback, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Slider } from "@/components/ui/slider";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import type { LayoutMode } from "@/lib/quranMetadata";

const LAYOUT_OPTIONS: { mode: LayoutMode; icon: string; label: string; desc: string }[] = [
  { mode: 'standard', icon: 'solar:align-vertical-spacing-bold', label: 'Standard', desc: 'Vertical scrolling layout' },
  { mode: 'focused-flow', icon: 'solar:book-2-bold', label: 'Focused Flow', desc: 'Horizontal reading mode' },
  { mode: 'mushaf', icon: 'solar:notebook-bold', label: 'Classic Mushaf', desc: 'Classic Medinan page view' },
  { mode: 'hifz', icon: 'solar:square-academic-cap-bold', label: 'Hifz', desc: 'Memorization mode' },
];

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
}

function LayoutDrawerContent({ layoutMode, onLayoutModeChange }: { layoutMode: LayoutMode; onLayoutModeChange?: (mode: LayoutMode) => void }) {
  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Select Layout</DrawerTitle>
      </DrawerHeader>
      <div className="px-4 pb-8 space-y-3">
        {LAYOUT_OPTIONS.map((opt) => (
          <button
            key={opt.mode}
            onClick={() => onLayoutModeChange?.(opt.mode)}
            className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
              layoutMode === opt.mode ? 'bg-primary/20 ring-2 ring-primary' : 'bg-muted/40 dark:bg-slate-800/40'
            }`}
            data-testid={`layout-option-${opt.mode}`}
          >
            <div className={`size-12 rounded-full flex items-center justify-center ${
              layoutMode === opt.mode ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              <Icon icon={opt.icon} className="size-6" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">{opt.label}</p>
              <p className="text-sm text-muted-foreground">{opt.desc}</p>
            </div>
          </button>
        ))}
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
}: AudioPlayerProps) {
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  const [showSpeedSlider, setShowSpeedSlider] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);
  const speedButtonRef = useRef<HTMLButtonElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Auto-hide logic
  const [isVisible, setIsVisible] = useState(true);
  const visibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldAutoHide = layoutMode === 'focused-flow' || layoutMode === 'mushaf' || layoutMode === 'hifz';

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
              className="size-10 rounded-full bg-card/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-lg flex items-center justify-center ring-1 ring-border/40 text-primary"
              aria-label="Select layout mode"
              data-testid="compact-layout-button"
            >
              <Icon icon="solar:layers-minimalistic-bold" className="size-4" />
            </button>
          </DrawerTrigger>
          <LayoutDrawerContent layoutMode={layoutMode} onLayoutModeChange={onLayoutModeChange} />
        </Drawer>
        <button
          className="size-14 rounded-full bg-card/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-lg flex items-center justify-center ring-1 ring-border/40 disabled:opacity-50 relative"
          onClick={onPlayPause}
          disabled={isLoading}
          aria-label={isLoading ? "Loading audio" : isPlaying ? "Pause audio" : "Play audio"}
          data-testid="compact-play-button"
        >
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="3" opacity="0.3" />
            <circle cx="28" cy="28" r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-200" />
          </svg>
          {isLoading ? (
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
  const remaining = Math.max(0, duration - currentTime);

  return (
    <div className={`fixed inset-x-0 bottom-0 z-20 transition-all duration-300 ${
      !isVisible ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
    }`} data-testid="audio-player-wrapper">
      {/* Gradient background: transparent at top, solid at bottom — content bleeds through */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background to-transparent dark:from-slate-950 dark:via-slate-950 dark:to-transparent pointer-events-none" />

      <div className="relative px-6 pt-10 pb-10 safe-area-bottom" data-testid="audio-player-content">

        {/* ── Surah info: bold name left, Arabic right ── */}
        <div className="flex items-end justify-between mb-5 px-1" data-testid="surah-info">
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground tracking-tight truncate" data-testid="text-surah-english">
              {surahNumber ? `${surahNumber}. ` : ''}{surahNameEnglish || 'Al-Fatihah'}
            </h2>
            {reciterName && (
              <p className="text-sm font-medium text-muted-foreground truncate" data-testid="text-reciter-name">
                {reciterName}
              </p>
            )}
          </div>
          {surahNameArabic && (
            <span className="font-arabic text-xl text-foreground/60 shrink-0 ml-4" data-testid="text-surah-arabic">
              {surahNameArabic}
            </span>
          )}
        </div>

        {/* ── Seek bar ── */}
        <div className="mb-1">
          <Slider
            value={[currentTime]}
            max={duration}
            step={1}
            onValueChange={(value) => onSeek?.(value[0])}
            className="w-full [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-range]]:bg-foreground/80"
            data-testid="slider-audio-progress"
          />
          <div className="flex items-center justify-between mt-1.5 px-0.5">
            <span className="text-[11px] tabular-nums font-medium text-muted-foreground" data-testid="text-current-time">
              {formatTime(currentTime)}
            </span>
            <span className="text-[11px] tabular-nums font-medium text-muted-foreground" data-testid="text-duration">
              -{formatTime(remaining)}
            </span>
          </div>
        </div>

        {/* ── Speed slider panel (long-press) ── */}
        {showSpeedSlider && (
          <div
            ref={sliderContainerRef}
            className="rounded-2xl bg-muted/60 dark:bg-slate-800/60 backdrop-blur-xl ring-1 ring-border p-4 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
            data-testid="speed-slider-panel"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Speed</span>
              <button onClick={() => onSpeedChange?.(1.0)} className="text-xs text-primary font-semibold px-2 py-0.5 rounded-md hover:bg-primary/10 transition-colors">
                Reset
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground w-8 text-right shrink-0">0.5x</span>
              <Slider
                value={[speed]} min={0.5} max={2.0} step={0.1}
                showTooltip tooltipContent={(v) => `${formatSpeed(v)}`}
                onValueChange={(value) => onSpeedChange?.(Math.round(value[0] * 10) / 10)}
                onValueCommit={() => setShowSpeedSlider(false)}
                className="flex-1" aria-label="Fine playback speed" data-testid="slider-speed"
              />
              <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">2x</span>
            </div>
            <div className="text-center mt-2">
              <span className="text-sm font-bold text-foreground">{formatSpeed(speed)}</span>
            </div>
          </div>
        )}

        {/* ── Controls row ── */}
        <div className="flex items-center justify-between mt-6 px-2">

          {/* Speed — plain text, green when not 1x */}
          <button
            ref={speedButtonRef}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onContextMenu={(e) => e.preventDefault()}
            className={`min-h-[44px] w-10 flex items-center justify-center select-none touch-none transition-colors ${
              speedIsModified ? 'text-emerald-500' : 'text-muted-foreground'
            }`}
            aria-label={`Playback speed ${formatSpeed(speed)}. Tap to cycle, hold for fine control`}
            data-testid="button-speed"
          >
            <span className="text-sm font-bold leading-none">
              {speed % 1 === 0 ? speed.toFixed(0) : parseFloat(speed.toFixed(1))}
              <span className="text-[10px] relative -top-0.5">x</span>
            </span>
          </button>

          {/* Center: prev, play/pause, next */}
          <div className="flex items-center gap-8">
            <button
              onClick={onPrevious}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-foreground hover:text-foreground/80 active:scale-95 transition-all"
              aria-label="Previous chapter"
              data-testid="button-previous"
            >
              <Icon icon="solar:skip-previous-bold" className="size-9" aria-hidden="true" />
            </button>

            <button
              className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              onClick={onPlayPause}
              disabled={isLoading}
              aria-label={isLoading ? "Loading audio" : isPlaying ? "Pause audio" : "Play audio"}
              data-testid="button-play-pause"
            >
              {isLoading ? (
                <div className="size-7 border-[2.5px] border-background border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" />
              ) : isPlaying ? (
                <Icon icon="solar:pause-bold" className="size-9 text-background" aria-hidden="true" />
              ) : (
                <Icon icon="solar:play-bold" className="size-9 text-background ml-1" aria-hidden="true" />
              )}
            </button>

            <button
              onClick={onNext}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-foreground hover:text-foreground/80 active:scale-95 transition-all"
              aria-label="Next chapter"
              data-testid="button-next"
            >
              <Icon icon="solar:skip-next-bold" className="size-9" aria-hidden="true" />
            </button>
          </div>

          {/* Right: layout drawer */}
          <Drawer>
            <DrawerTrigger asChild>
              <button
                className={`min-h-[44px] w-10 flex items-center justify-center transition-colors ${
                  layoutMode !== 'standard' ? 'text-primary' : 'text-muted-foreground'
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
  );
}
