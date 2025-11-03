import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
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
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cycleSpeed = () => {
    const currentIndex = speedOptions.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speedOptions.length;
    onSpeedChange?.(speedOptions[nextIndex]);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-20" data-testid="audio-player-wrapper" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Glass background with gradient borders */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-card/90 dark:bg-slate-900/90 backdrop-blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />
        
        <div className="relative px-6 py-6 pb-8 space-y-4 shadow-2xl" data-testid="audio-player-content">
          {/* Surah Information - Above progress bar, side by side */}
          {(surahNameArabic || surahNameEnglish) && (
            <div className="flex items-center justify-center gap-3 py-1" data-testid="surah-info">
              {surahNameArabic && (
                <span className="font-arabic text-xl text-foreground" data-testid="text-surah-arabic">
                  {surahNameArabic}
                </span>
              )}
              {surahNumber && surahNameEnglish && (
                <span className="text-sm text-muted-foreground">•</span>
              )}
              {surahNumber && (
                <span className="text-sm font-semibold text-muted-foreground" data-testid="text-surah-number">
                  {surahNumber}
                </span>
              )}
              {surahNameEnglish && (
                <span className="text-sm font-semibold text-foreground" data-testid="text-surah-english">
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
          
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={cycleSpeed}
              className="min-h-[48px] min-w-[60px] px-3 rounded-2xl bg-muted/60 dark:bg-slate-800/60 backdrop-blur-xl shadow-md hover-elevate active-elevate-2 flex items-center justify-center ring-1 ring-border"
              aria-label={`Playback speed ${speed.toFixed(2)}x. Click to change`}
              title="Click to cycle playback speed"
              data-testid="button-speed"
            >
              <span className="text-base font-semibold text-foreground">{speed.toFixed(2)}x</span>
            </button>
            
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onPrevious}
                className="min-h-[48px] min-w-[48px] size-12 rounded-full bg-muted/60 dark:bg-slate-800/60 backdrop-blur-xl flex items-center justify-center hover-elevate active-elevate-2 shadow-md ring-1 ring-border"
                data-testid="button-previous"
              >
                <Icon icon="solar:skip-previous-bold" className="size-6 text-foreground" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} />
              </button>
              
              <button
                className="min-h-[64px] min-w-[64px] size-16 rounded-full bg-primary flex items-center justify-center shadow-xl hover-elevate active-elevate-2 disabled:opacity-50 ring-2 ring-primary/20"
                onClick={onPlayPause}
                disabled={isLoading}
                data-testid="button-play-pause"
              >
                {isLoading ? (
                  <div className="size-8 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Icon icon="solar:pause-bold" className="size-7 text-primary-foreground" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} />
                ) : (
                  <Icon icon="solar:play-bold" className="size-7 text-primary-foreground ml-0.5" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} />
                )}
              </button>
              
              <button
                onClick={onNext}
                className="min-h-[48px] min-w-[48px] size-12 rounded-full bg-muted/60 dark:bg-slate-800/60 backdrop-blur-xl flex items-center justify-center hover-elevate active-elevate-2 shadow-md ring-1 ring-border"
                data-testid="button-next"
              >
                <Icon icon="solar:skip-next-bold" className="size-6 text-foreground" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} />
              </button>
            </div>
            
            <button
              className={`min-h-[48px] min-w-[48px] size-12 rounded-full flex items-center justify-center hover-elevate active-elevate-2 shadow-md ring-1 backdrop-blur-xl ${
                repeat ? 'bg-primary/25 text-primary ring-primary/30' : 'bg-muted/60 dark:bg-slate-800/60 text-muted-foreground ring-border'
              }`}
              onClick={() => onRepeatChange?.(!repeat)}
              data-testid="button-repeat"
            >
              <Icon icon="solar:repeat-bold" className="size-6" style={{filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'}} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
