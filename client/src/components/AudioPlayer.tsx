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
    <div className="fixed inset-x-0 bottom-0 z-10" data-testid="audio-player-wrapper">
      <div className="bg-card/95 backdrop-blur-xl border-t border-border px-6 py-6 space-y-5 shadow-2xl" data-testid="audio-player-content">
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
        
        <div className="grid grid-cols-3 items-center">
          <div className="flex justify-start gap-2">
            <Button
              variant="ghost"
              size="default"
              className="text-base font-semibold min-w-16 h-11 rounded-2xl"
              onClick={cycleSpeed}
              aria-label={`Playback speed ${speed.toFixed(2)}x. Click to change`}
              title="Click to cycle playback speed"
              data-testid="button-speed"
            >
              {speed.toFixed(2)}x
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onPrevious}
              className="size-12 rounded-full bg-secondary/50 flex items-center justify-center hover-elevate active-elevate-2"
              data-testid="button-previous"
            >
              <Icon icon="solar:skip-previous-bold" className="size-6 text-foreground" />
            </button>
            
            <button
              className="size-16 rounded-full bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center shadow-xl shadow-primary/20 hover-elevate active-elevate-2 disabled:opacity-50"
              onClick={onPlayPause}
              disabled={isLoading}
              data-testid="button-play-pause"
            >
              {isLoading ? (
                <div className="size-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Icon icon="solar:pause-bold" className="size-8 text-white" />
              ) : (
                <Icon icon="solar:play-bold" className="size-8 text-white ml-1" />
              )}
            </button>
            
            <button
              onClick={onNext}
              className="size-12 rounded-full bg-secondary/50 flex items-center justify-center hover-elevate active-elevate-2"
              data-testid="button-next"
            >
              <Icon icon="solar:skip-next-bold" className="size-6 text-foreground" />
            </button>
          </div>
          
          <div className="flex justify-end">
            <button
              className={`size-11 rounded-full flex items-center justify-center hover-elevate active-elevate-2 ${
                repeat ? 'bg-primary/10 text-primary' : 'bg-secondary/50 text-muted-foreground'
              }`}
              onClick={() => onRepeatChange?.(!repeat)}
              data-testid="button-repeat"
            >
              <Icon icon="solar:repeat-bold" className="size-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
