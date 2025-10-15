import { Play, Pause, SkipBack, SkipForward, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

interface AudioPlayerProps {
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  speed?: number;
  isLoading?: boolean;
  autoScroll?: boolean;
  repeat?: boolean;
  onPlayPause?: () => void;
  onSeek?: (time: number) => void;
  onSpeedChange?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onAutoScrollChange?: (enabled: boolean) => void;
  onRepeatChange?: (enabled: boolean) => void;
}

export default function AudioPlayer({
  currentTime = 0,
  duration = 205,
  isPlaying = false,
  speed = 1.0,
  isLoading = false,
  autoScroll = false,
  repeat = false,
  onPlayPause,
  onSeek,
  onSpeedChange,
  onPrevious,
  onNext,
  onAutoScrollChange,
  onRepeatChange,
}: AudioPlayerProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-10" data-testid="text-current-time">
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
        <span className="text-xs text-muted-foreground w-10 text-right" data-testid="text-duration">
          {formatTime(duration)}
        </span>
      </div>
      
      <div className="grid grid-cols-3 items-center">
        <div className="flex justify-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSpeedChange}
            className="text-sm font-medium min-w-12"
            data-testid="button-speed"
          >
            {speed.toFixed(2)}x
          </Button>
        </div>
        
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            className="rounded-full"
            data-testid="button-previous"
          >
            <SkipBack className="w-5 h-5" />
          </Button>
          
          <Button
            variant="default"
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={onPlayPause}
            disabled={isLoading}
            data-testid="button-play-pause"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="rounded-full"
            data-testid="button-next"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="button-more"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Playback Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="flex items-center justify-between"
                onSelect={(e) => e.preventDefault()}
                data-testid="menu-item-auto-scroll"
              >
                <span>Auto-scroll</span>
                <Switch 
                  checked={autoScroll} 
                  onCheckedChange={onAutoScrollChange}
                  data-testid="switch-auto-scroll"
                />
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center justify-between"
                onSelect={(e) => e.preventDefault()}
                data-testid="menu-item-repeat"
              >
                <span>Repeat</span>
                <Switch 
                  checked={repeat} 
                  onCheckedChange={onRepeatChange}
                  data-testid="switch-repeat"
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
