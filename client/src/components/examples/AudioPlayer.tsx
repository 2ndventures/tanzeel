import { useState } from 'react';
import AudioPlayer from '../AudioPlayer';

export default function AudioPlayerExample() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(83);
  const [speed, setSpeed] = useState(1.0);

  return (
    <div className="p-4">
      <AudioPlayer
        currentTime={currentTime}
        duration={205}
        isPlaying={isPlaying}
        speed={speed}
        onPlayPause={() => {
          setIsPlaying(!isPlaying);
          console.log('Play/Pause toggled');
        }}
        onSeek={(time) => {
          setCurrentTime(time);
          console.log('Seeked to:', time);
        }}
        onSpeedChange={() => {
          const newSpeed = speed === 1.0 ? 1.5 : speed === 1.5 ? 2.0 : 1.0;
          setSpeed(newSpeed);
          console.log('Speed changed to:', newSpeed);
        }}
        onPrevious={() => console.log('Previous clicked')}
        onNext={() => console.log('Next clicked')}
      />
    </div>
  );
}
