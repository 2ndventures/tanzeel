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
  darkMode?: boolean;
  transliteration?: boolean;
  showTranslation?: boolean;
  autoplay?: boolean;
  onPlayPause?: () => void;
  onSeek?: (time: number) => void;
  onSpeedChange?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onAutoScrollChange?: (enabled: boolean) => void;
  onRepeatChange?: (enabled: boolean) => void;
  onDarkModeChange?: (enabled: boolean) => void;
  onTransliterationChange?: (enabled: boolean) => void;
  onShowTranslationChange?: (enabled: boolean) => void;
  onAutoplayChange?: (enabled: boolean) => void;
}

export default function AudioPlayer({
  currentTime = 0,
  duration = 205,
  isPlaying = false,
  speed = 1.0,
  isLoading = false,
  autoScroll = false,
  repeat = false,
  darkMode = false,
  transliteration = false,
  showTranslation = false,
  autoplay = false,
  onPlayPause,
  onSeek,
  onSpeedChange,
  onPrevious,
  onNext,
  onAutoScrollChange,
  onRepeatChange,
  onDarkModeChange,
  onTransliterationChange,
  onShowTranslationChange,
  onAutoplayChange,
}: AudioPlayerProps) {
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
          <Button
            variant="ghost"
            size="default"
            onClick={onSpeedChange}
            className="text-base font-medium min-w-16 h-11"
            data-testid="button-speed"
          >
            {speed.toFixed(2)}x
          </Button>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-11 h-11 flex-shrink-0 aspect-square"
                data-testid="button-more"
              >
                <MoreVertical className="w-6 h-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Playback Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="flex items-center justify-between"
                onSelect={(e) => e.preventDefault()}
                data-testid="menu-item-theme"
              >
                <span>Theme</span>
                <Switch 
                  checked={darkMode} 
                  onCheckedChange={onDarkModeChange}
                  data-testid="switch-theme"
                />
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center justify-between"
                onSelect={(e) => e.preventDefault()}
                data-testid="menu-item-transliteration"
              >
                <span>Transliteration</span>
                <Switch 
                  checked={transliteration} 
                  onCheckedChange={onTransliterationChange}
                  data-testid="switch-transliteration"
                />
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center justify-between"
                onSelect={(e) => e.preventDefault()}
                data-testid="menu-item-translation"
              >
                <span>Translation</span>
                <Switch 
                  checked={showTranslation} 
                  onCheckedChange={onShowTranslationChange}
                  data-testid="switch-translation"
                />
              </DropdownMenuItem>
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
              <DropdownMenuItem 
                className="flex items-center justify-between"
                onSelect={(e) => e.preventDefault()}
                data-testid="menu-item-autoplay"
              >
                <span>Autoplay</span>
                <Switch 
                  checked={autoplay} 
                  onCheckedChange={onAutoplayChange}
                  data-testid="switch-autoplay"
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
    </div>
  );
}
