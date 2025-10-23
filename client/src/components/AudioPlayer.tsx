import { Play, Pause, SkipBack, SkipForward, Repeat } from "lucide-react";
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
  // Speed options from 0.5 to 2.0 in 0.25 increments
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
      <div className="bg-card border-t border-border px-6 py-6 space-y-5" data-testid="audio-player-content">
        <div className="flex items-center gap-4">
          <span className="text-base font-medium text-muted-foreground w-14" data-testid="text-current-time">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration}
            step={1}
            onValueChange={(value) => onSeek?.(value[0])}
            className="flex-1"
            data-testid="slider-audio-progress"
          />
          <span className="text-base font-medium text-muted-foreground w-14 text-right" data-testid="text-duration">
            {formatTime(duration)}
          </span>
        </div>
        
        <div className="grid grid-cols-3 items-center gap-4">
          <div className="flex justify-start">
            <Button
              variant="ghost"
              size="lg"
              className="text-lg font-semibold min-w-20"
              onClick={cycleSpeed}
              aria-label={`Playback speed ${speed.toFixed(2)}x. Click to change`}
              title="Click to cycle playback speed"
              data-testid="button-speed"
            >
              {speed.toFixed(2)}x
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              className="rounded-full w-14 h-14 flex-shrink-0 aspect-square"
              data-testid="button-previous"
            >
              <SkipBack className="w-7 h-7" />
            </Button>
            
            <Button
              variant="default"
              size="icon"
              className="w-20 h-20 rounded-full flex-shrink-0 aspect-square"
              onClick={onPlayPause}
              disabled={isLoading}
              data-testid="button-play-pause"
            >
              {isLoading ? (
                <div className="w-9 h-9 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-9 h-9" />
              ) : (
                <Play className="w-9 h-9 ml-0.5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              className="rounded-full w-14 h-14 flex-shrink-0 aspect-square"
              data-testid="button-next"
            >
              <SkipForward className="w-7 h-7" />
            </Button>
          </div>
          
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className={`w-14 h-14 flex-shrink-0 aspect-square ${repeat ? 'text-primary' : ''}`}
              onClick={() => onRepeatChange?.(!repeat)}
              data-testid="button-repeat"
            >
              <Repeat className="w-7 h-7" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
