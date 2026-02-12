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
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
  compact?: boolean;
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

  // Auto-hide logic for focused-flow mode
  const [isVisible, setIsVisible] = useState(true);
  const visibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetVisibilityTimer = useCallback(() => {
    setIsVisible(true);
    if (visibilityTimeoutRef.current) {
      clearTimeout(visibilityTimeoutRef.current);
    }
    if (layoutMode === 'focused-flow' || layoutMode === 'mushaf' || layoutMode === 'hifz') {
      visibilityTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    }
  }, [layoutMode]);

  useEffect(() => {
    if (layoutMode === 'focused-flow' || layoutMode === 'mushaf' || layoutMode === 'hifz') {
      resetVisibilityTimer();
    } else {
      setIsVisible(true);
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    }
    return () => {
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [layoutMode]);

  // Listen for interaction events globally to show player in focused-flow
  useEffect(() => {
    if (layoutMode !== 'focused-flow' && layoutMode !== 'mushaf' && layoutMode !== 'hifz') return;
    const handleInteraction = () => resetVisibilityTimer();
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('click', handleInteraction);
    window.addEventListener('mousemove', handleInteraction);
    return () => {
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('mousemove', handleInteraction);
    };
  }, [layoutMode, resetVisibilityTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSpeed = (s: number) => {
    return s % 1 === 0 ? `${s.toFixed(0)}x` : `${parseFloat(s.toFixed(1))}x`;
  };

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
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!didLongPressRef.current) {
      if (showSpeedSlider) {
        setShowSpeedSlider(false);
      } else {
        cycleSpeed();
      }
    }
  }, [speed, onSpeedChange, showSpeedSlider]);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Close slider when clicking outside
  useEffect(() => {
    if (!showSpeedSlider) return;
    const handleClickOutside = (e: PointerEvent) => {
      const container = sliderContainerRef.current;
      const btn = speedButtonRef.current;
      if (container && !container.contains(e.target as Node) && btn && !btn.contains(e.target as Node)) {
        setShowSpeedSlider(false);
      }
    };
    const timeout = setTimeout(() => {
      document.addEventListener('pointerdown', handleClickOutside);
    }, 50);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [showSpeedSlider]);

  // Compact mode: floating circular play/pause button with progress ring
  if (compact) {
    const progressFraction = duration > 0 ? currentTime / duration : 0;
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progressFraction);

    return (
      <button
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 size-14 rounded-full bg-card/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-lg flex items-center justify-center ring-1 ring-border/40 disabled:opacity-50"
        onClick={onPlayPause}
        disabled={isLoading}
        aria-label={isLoading ? "Loading audio" : isPlaying ? "Pause audio" : "Play audio"}
        data-testid="compact-play-button"
      >
        {/* SVG progress ring */}
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="3" opacity="0.3" />
          <circle
            cx="28" cy="28" r={radius} fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-200"
          />
        </svg>
        {/* Icon */}
        {isLoading ? (
          <div className="size-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Icon icon="solar:pause-bold" className="size-5 text-foreground relative z-10" />
        ) : (
          <Icon icon="solar:play-bold" className="size-5 text-foreground ml-0.5 relative z-10" />
        )}
      </button>
    );
  }

  return (
    <div className={`fixed inset-x-0 bottom-0 z-20 transition-all duration-300 ${
      !isVisible ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
    }`} data-testid="audio-player-wrapper">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-card/95 dark:bg-slate-900/95 backdrop-blur-2xl" />
        <div className="absolute top-0 left-0 right-0 h-px bg-border/40" />

        <div className="relative px-5 pt-3 safe-area-bottom" data-testid="audio-player-content">
          {/* Surah names flanking the seek bar — English left, Arabic right */}
          {(surahNameArabic || surahNameEnglish) && (
            <div className="flex items-center justify-between mb-1" data-testid="surah-info">
              <div className="flex items-center gap-2">
                {surahNumber && (
                  <span className="text-xs font-bold text-muted-foreground/60" data-testid="text-surah-number">
                    {surahNumber}.
                  </span>
                )}
                {surahNameEnglish && (
                  <span className="text-xs font-semibold text-foreground/80" data-testid="text-surah-english">
                    {surahNameEnglish}
                  </span>
                )}
              </div>
              {surahNameArabic && (
                <span className="font-arabic text-base text-foreground/80" data-testid="text-surah-arabic">
                  {surahNameArabic}
                </span>
              )}
            </div>
          )}

          {/* Seek bar + timestamps */}
          <div>
            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              onValueChange={(value) => onSeek?.(value[0])}
              className="w-full [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-white/90 [&_[data-slot=slider-range]]:to-white/60 dark:[&_[data-slot=slider-range]]:from-white/80 dark:[&_[data-slot=slider-range]]:to-white/50"
              data-testid="slider-audio-progress"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] tabular-nums text-muted-foreground/60" data-testid="text-current-time">
                {formatTime(currentTime)}
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground/60" data-testid="text-duration">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Speed slider panel */}
          {showSpeedSlider && (
            <div
              ref={sliderContainerRef}
              className="rounded-2xl bg-muted/60 dark:bg-slate-800/60 backdrop-blur-xl ring-1 ring-border p-4 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
              data-testid="speed-slider-panel"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Speed</span>
                <button
                  onClick={() => {
                    onSpeedChange?.(1.0);
                  }}
                  className="text-xs text-primary font-semibold px-2 py-0.5 rounded-md hover:bg-primary/10 transition-colors"
                >
                  Reset
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground w-8 text-right shrink-0">0.5x</span>
                <Slider
                  value={[speed]}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  showTooltip
                  tooltipContent={(v) => `${formatSpeed(v)}`}
                  onValueChange={(value) => {
                    const rounded = Math.round(value[0] * 10) / 10;
                    onSpeedChange?.(rounded);
                  }}
                  onValueCommit={() => {
                    setShowSpeedSlider(false);
                  }}
                  className="flex-1"
                  aria-label="Fine playback speed"
                  data-testid="slider-speed"
                />
                <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">2x</span>
              </div>
              <div className="text-center mt-2">
                <span className="text-sm font-bold text-foreground">{formatSpeed(speed)}</span>
              </div>
            </div>
          )}

          {/* Playback controls with breathing room at bottom */}
          <div className="flex items-center justify-between gap-2 pt-2 pb-4">
            <button
              ref={speedButtonRef}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              className="min-h-[44px] min-w-[52px] px-3 rounded-xl bg-muted/50 dark:bg-slate-800/50 flex items-center justify-center ring-1 ring-border/50 select-none touch-none"
              aria-label={`Playback speed ${formatSpeed(speed)}. Tap to cycle, hold for fine control`}
              title="Tap to cycle speed, hold for fine control"
              data-testid="button-speed"
            >
              <span className="text-sm font-semibold text-foreground/80">{formatSpeed(speed)}</span>
            </button>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={onPrevious}
                className="min-h-[44px] min-w-[44px] size-11 rounded-full flex items-center justify-center active:opacity-70 transition-opacity"
                aria-label="Previous chapter"
                data-testid="button-previous"
              >
                <Icon icon="solar:skip-previous-bold" className="size-6 text-foreground/70" aria-hidden="true" />
              </button>

              <button
                className="min-h-[56px] min-w-[56px] size-14 rounded-full bg-foreground flex items-center justify-center shadow-lg disabled:opacity-50"
                onClick={onPlayPause}
                disabled={isLoading}
                aria-label={isLoading ? "Loading audio" : isPlaying ? "Pause audio" : "Play audio"}
                data-testid="button-play-pause"
              >
                {isLoading ? (
                  <div className="size-6 border-2 border-background border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" />
                ) : isPlaying ? (
                  <Icon icon="solar:pause-bold" className="size-6 text-background" aria-hidden="true" />
                ) : (
                  <Icon icon="solar:play-bold" className="size-6 text-background ml-0.5" aria-hidden="true" />
                )}
              </button>

              <button
                onClick={onNext}
                className="min-h-[44px] min-w-[44px] size-11 rounded-full flex items-center justify-center active:opacity-70 transition-opacity"
                aria-label="Next chapter"
                data-testid="button-next"
              >
                <Icon icon="solar:skip-next-bold" className="size-6 text-foreground/70" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                className={`min-h-[44px] min-w-[44px] size-11 rounded-full flex items-center justify-center transition-colors ${
                  repeat ? 'text-primary' : 'text-muted-foreground/50'
                }`}
                onClick={() => onRepeatChange?.(!repeat)}
                aria-label={repeat ? "Repeat enabled. Click to disable" : "Repeat disabled. Click to enable"}
                aria-pressed={repeat}
                data-testid="button-repeat"
              >
                <Icon icon="solar:repeat-bold" className="size-5" aria-hidden="true" />
              </button>

              <Drawer>
                <DrawerTrigger asChild>
                  <button
                    className={`min-h-[44px] min-w-[44px] size-11 rounded-full flex items-center justify-center transition-colors ${
                      layoutMode !== 'standard' ? 'text-primary' : 'text-muted-foreground/50'
                    }`}
                    aria-label="Select layout mode"
                    data-testid="button-layout"
                  >
                    <Icon icon="solar:layers-minimalistic-bold" className="size-5" aria-hidden="true" />
                  </button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Select Layout</DrawerTitle>
                  </DrawerHeader>
                  <div className="px-4 pb-8 space-y-3">
                    <button
                      onClick={() => onLayoutModeChange?.('standard')}
                      className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
                        layoutMode === 'standard'
                          ? 'bg-primary/20 ring-2 ring-primary'
                          : 'bg-muted/40 dark:bg-slate-800/40'
                      }`}
                      data-testid="layout-option-standard"
                    >
                      <div className={`size-12 rounded-full flex items-center justify-center ${
                        layoutMode === 'standard' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon icon="solar:align-vertical-spacing-bold" className="size-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-foreground">Standard</p>
                        <p className="text-sm text-muted-foreground">Vertical scrolling layout</p>
                      </div>
                    </button>

                    <button
                      onClick={() => onLayoutModeChange?.('focused-flow')}
                      className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
                        layoutMode === 'focused-flow'
                          ? 'bg-primary/20 ring-2 ring-primary'
                          : 'bg-muted/40 dark:bg-slate-800/40'
                      }`}
                      data-testid="layout-option-focused-flow"
                    >
                      <div className={`size-12 rounded-full flex items-center justify-center ${
                        layoutMode === 'focused-flow' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon icon="solar:book-2-bold" className="size-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-foreground">Focused Flow</p>
                        <p className="text-sm text-muted-foreground">Horizontal reading mode</p>
                      </div>
                    </button>

                    <button
                      onClick={() => onLayoutModeChange?.('mushaf')}
                      className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
                        layoutMode === 'mushaf'
                          ? 'bg-primary/20 ring-2 ring-primary'
                          : 'bg-muted/40 dark:bg-slate-800/40'
                      }`}
                      data-testid="layout-option-mushaf"
                    >
                      <div className={`size-12 rounded-full flex items-center justify-center ${
                        layoutMode === 'mushaf' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon icon="solar:notebook-bold" className="size-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-foreground">Mushaf</p>
                        <p className="text-sm text-muted-foreground">Classic Medinan page view</p>
                      </div>
                    </button>

                    <button
                      onClick={() => onLayoutModeChange?.('hifz')}
                      className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
                        layoutMode === 'hifz'
                          ? 'bg-primary/20 ring-2 ring-primary'
                          : 'bg-muted/40 dark:bg-slate-800/40'
                      }`}
                      data-testid="layout-option-hifz"
                    >
                      <div className={`size-12 rounded-full flex items-center justify-center ${
                        layoutMode === 'hifz' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon icon="solar:square-academic-cap-bold" className="size-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-foreground">Hifz</p>
                        <p className="text-sm text-muted-foreground">Memorization mode</p>
                      </div>
                    </button>

                    <button
                      onClick={() => onLayoutModeChange?.('scientific')}
                      className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
                        layoutMode === 'scientific'
                          ? 'bg-primary/20 ring-2 ring-primary'
                          : 'bg-muted/40 dark:bg-slate-800/40'
                      }`}
                      data-testid="layout-option-scientific"
                    >
                      <div className={`size-12 rounded-full flex items-center justify-center ${
                        layoutMode === 'scientific' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon icon="solar:document-medicine-bold" className="size-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-foreground">Scientific</p>
                        <p className="text-sm text-muted-foreground">Word analysis & tafsir</p>
                      </div>
                    </button>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
