import { useState, useRef, useCallback, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Slider } from "@/components/ui/slider";

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
}: AudioPlayerProps) {
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  const [showSpeedSlider, setShowSpeedSlider] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);
  const speedButtonRef = useRef<HTMLButtonElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

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
      // If slider is already open, tap closes it instead of cycling
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

  return (
    <div className="fixed inset-x-0 bottom-0 z-20" data-testid="audio-player-wrapper">
      {/* Glass background with gradient borders */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-card/90 dark:bg-slate-900/90 backdrop-blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />
        
        <div className="relative px-6 pt-6 space-y-4 shadow-2xl safe-area-bottom" data-testid="audio-player-content">
          {/* Surah Information - Above progress bar, side by side */}
          {(surahNameArabic || surahNameEnglish) && (
            <div className="flex items-center justify-start gap-3 py-1" data-testid="surah-info">
              {surahNameArabic && (
                <span className="font-arabic text-xl font-bold text-foreground" data-testid="text-surah-arabic">
                  {surahNameArabic}
                </span>
              )}
              {surahNumber && surahNameEnglish && (
                <span className="text-sm font-bold text-muted-foreground">•</span>
              )}
              {surahNumber && (
                <span className="text-sm font-bold text-muted-foreground" data-testid="text-surah-number">
                  {surahNumber}
                </span>
              )}
              {surahNameEnglish && (
                <span className="text-sm font-bold text-foreground" data-testid="text-surah-english">
                  {surahNameEnglish}
                </span>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              onValueChange={(value) => onSeek?.(value[0])}
              className="w-full"
              data-testid="slider-audio-progress"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground" data-testid="text-current-time">
                {formatTime(currentTime)}
              </span>
              <span className="text-sm font-medium text-muted-foreground" data-testid="text-duration">
                {formatTime(duration)}
              </span>
            </div>
          </div>
          
          {/* Speed slider panel — slides in above controls on long-press */}
          {showSpeedSlider && (
            <div
              ref={sliderContainerRef}
              className="rounded-2xl bg-muted/60 dark:bg-slate-800/60 backdrop-blur-xl ring-1 ring-border p-4 animate-in fade-in slide-in-from-bottom-2 duration-200"
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

          <div className="flex items-center justify-between gap-2">
            <button
              ref={speedButtonRef}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              className="min-h-[48px] min-w-[60px] px-3 rounded-2xl bg-muted/60 dark:bg-slate-800/60 backdrop-blur-xl shadow-md hover-elevate active-elevate-2 flex items-center justify-center ring-1 ring-border select-none touch-none"
              aria-label={`Playback speed ${formatSpeed(speed)}. Tap to cycle, hold for fine control`}
              title="Tap to cycle speed, hold for fine control"
              data-testid="button-speed"
            >
              <span className="text-base font-semibold text-foreground">{formatSpeed(speed)}</span>
            </button>
            
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onPrevious}
                className="min-h-[48px] min-w-[48px] size-12 rounded-full bg-muted/60 dark:bg-slate-800/60 backdrop-blur-xl flex items-center justify-center hover-elevate active-elevate-2 shadow-md ring-1 ring-border"
                aria-label="Previous chapter"
                data-testid="button-previous"
              >
                <Icon icon="solar:skip-previous-bold" className="size-6 text-foreground" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} aria-hidden="true" />
              </button>
              
              <button
                className="min-h-[64px] min-w-[64px] size-16 rounded-full bg-primary flex items-center justify-center shadow-xl hover-elevate active-elevate-2 disabled:opacity-50 ring-2 ring-primary/20"
                onClick={onPlayPause}
                disabled={isLoading}
                aria-label={isLoading ? "Loading audio" : isPlaying ? "Pause audio" : "Play audio"}
                data-testid="button-play-pause"
              >
                {isLoading ? (
                  <div className="size-8 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" />
                ) : isPlaying ? (
                  <Icon icon="solar:pause-bold" className="size-7 text-primary-foreground" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} aria-hidden="true" />
                ) : (
                  <Icon icon="solar:play-bold" className="size-7 text-primary-foreground ml-0.5" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} aria-hidden="true" />
                )}
              </button>
              
              <button
                onClick={onNext}
                className="min-h-[48px] min-w-[48px] size-12 rounded-full bg-muted/60 dark:bg-slate-800/60 backdrop-blur-xl flex items-center justify-center hover-elevate active-elevate-2 shadow-md ring-1 ring-border"
                aria-label="Next chapter"
                data-testid="button-next"
              >
                <Icon icon="solar:skip-next-bold" className="size-6 text-foreground" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} aria-hidden="true" />
              </button>
            </div>
            
            <button
              className={`min-h-[48px] min-w-[48px] size-12 rounded-full flex items-center justify-center hover-elevate active-elevate-2 shadow-md ring-1 backdrop-blur-xl ${
                repeat ? 'bg-primary/25 text-primary ring-primary/30' : 'bg-muted/60 dark:bg-slate-800/60 text-muted-foreground ring-border'
              }`}
              onClick={() => onRepeatChange?.(!repeat)}
              aria-label={repeat ? "Repeat enabled. Click to disable" : "Repeat disabled. Click to enable"}
              aria-pressed={repeat}
              data-testid="button-repeat"
            >
              <Icon icon="solar:repeat-bold" className="size-6" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
