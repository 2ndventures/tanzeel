import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface AudioPlayerProps {
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  speed?: number;
  onPlayPause?: () => void;
  onSeek?: (time: number) => void;
  onSpeedChange?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export default function AudioPlayer({
  currentTime = 0,
  duration = 205,
  isPlaying = false,
  speed = 1.0,
  onPlayPause,
  onSeek,
  onSpeedChange,
  onPrevious,
  onNext,
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
      
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSpeedChange}
          className="text-sm font-medium"
          data-testid="button-speed"
        >
          {speed}x
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            data-testid="button-previous"
          >
            <SkipBack className="w-5 h-5" />
          </Button>
          
          <Button
            variant="default"
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={onPlayPause}
            data-testid="button-play-pause"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            data-testid="button-next"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-more"
        >
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
