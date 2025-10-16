import { Play, Pause, SkipBack, SkipForward, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

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
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  
  // Speed options from 0.5 to 2.0 in 0.25 increments
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-10" data-testid="audio-player-wrapper">
      <div className="bg-card border-t border-border px-4 py-4 space-y-4" data-testid="audio-player-content">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-12" data-testid="text-current-time">
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
          <span className="text-sm text-muted-foreground w-12 text-right" data-testid="text-duration">
            {formatTime(duration)}
          </span>
        </div>
        
        <div className="grid grid-cols-3 items-center">
        <div className="flex justify-start">
          <DropdownMenu open={isSpeedMenuOpen} onOpenChange={setIsSpeedMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="default"
                className="text-base font-medium min-w-16 h-11"
                data-testid="button-speed"
              >
                {speed.toFixed(2)}x
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32">
              {speedOptions.map((speedOption) => (
                <DropdownMenuItem
                  key={speedOption}
                  className="cursor-pointer justify-center"
                  onClick={() => {
                    onSpeedChange?.(speedOption);
                    setIsSpeedMenuOpen(false);
                  }}
                  data-testid={`speed-option-${speedOption}`}
                >
                  {speedOption.toFixed(2)}x
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            className="rounded-full w-11 h-11 flex-shrink-0 aspect-square"
            data-testid="button-previous"
          >
            <SkipBack className="w-6 h-6" />
          </Button>
          
          <Button
            variant="default"
            size="icon"
            className="w-16 h-16 rounded-full flex-shrink-0 aspect-square"
            onClick={onPlayPause}
            disabled={isLoading}
            data-testid="button-play-pause"
          >
            {isLoading ? (
              <div className="w-7 h-7 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-7 h-7" />
            ) : (
              <Play className="w-7 h-7 ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="rounded-full w-11 h-11 flex-shrink-0 aspect-square"
            data-testid="button-next"
          >
            <SkipForward className="w-6 h-6" />
          </Button>
        </div>
        
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className={`w-11 h-11 flex-shrink-0 aspect-square ${repeat ? 'text-primary' : ''}`}
            onClick={() => onRepeatChange?.(!repeat)}
            data-testid="button-repeat"
          >
            <Repeat className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
    </div>
  );
}
