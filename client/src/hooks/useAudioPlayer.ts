import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  isLoading: boolean;
  error: string | null;
}

interface VerseTimestamp {
  verse: number;
  start: number;
  end: number;
}

export function useAudioPlayer(
  audioUrl: string,
  verseTimestamps: VerseTimestamp[],
  onVerseChange?: (verse: number) => void
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    speed: 1.0,
    isLoading: true,
    error: null,
  });

  const [currentVerse, setCurrentVerse] = useState<number>(1);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setState(prev => ({
        ...prev,
        duration: audio.duration,
        isLoading: false,
      }));
    };

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));

      // Update current verse based on timestamp
      const verse = verseTimestamps.find(
        v => audio.currentTime >= v.start && audio.currentTime < v.end
      );
      if (verse && verse.verse !== currentVerse) {
        setCurrentVerse(verse.verse);
        onVerseChange?.(verse.verse);
      }
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleError = () => {
      setState(prev => ({
        ...prev,
        error: 'Failed to load audio',
        isLoading: false,
      }));
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [audioUrl, verseTimestamps, currentVerse, onVerseChange]);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(prev => ({ ...prev, currentTime: time }));
    }
  }, []);

  const setSpeed = useCallback((speed: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      setState(prev => ({ ...prev, speed }));
    }
  }, []);

  const seekToVerse = useCallback((verseNumber: number) => {
    const verse = verseTimestamps.find(v => v.verse === verseNumber);
    if (verse) {
      seek(verse.start);
    }
  }, [verseTimestamps, seek]);

  const nextVerse = useCallback(() => {
    const nextVerseNum = currentVerse + 1;
    const verse = verseTimestamps.find(v => v.verse === nextVerseNum);
    if (verse) {
      seek(verse.start);
    }
  }, [currentVerse, verseTimestamps, seek]);

  const previousVerse = useCallback(() => {
    const prevVerseNum = Math.max(1, currentVerse - 1);
    const verse = verseTimestamps.find(v => v.verse === prevVerseNum);
    if (verse) {
      seek(verse.start);
    }
  }, [currentVerse, verseTimestamps, seek]);

  return {
    ...state,
    currentVerse,
    play,
    pause,
    togglePlayPause,
    seek,
    setSpeed,
    seekToVerse,
    nextVerse,
    previousVerse,
  };
}
