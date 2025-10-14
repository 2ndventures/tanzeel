import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

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
  onVerseChange?: (verse: number) => void,
  repeat: boolean = false
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentVerseRef = useRef<number>(1);
  const onVerseChangeRef = useRef(onVerseChange);
  const repeatRef = useRef(repeat);
  const speedRef = useRef(1.0);
  const verseTimestampsRef = useRef(verseTimestamps);
  
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    speed: 1.0,
    isLoading: true,
    error: null,
  });

  const [currentVerse, setCurrentVerse] = useState<number>(1);

  // Keep refs up to date
  useEffect(() => {
    onVerseChangeRef.current = onVerseChange;
  }, [onVerseChange]);

  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  useEffect(() => {
    verseTimestampsRef.current = verseTimestamps;
  }, [verseTimestamps]);

  // Initialize audio element only when audioUrl changes
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous'; // Enable CORS for external audio
    audioRef.current = audio;

    // Reset state when audio URL changes
    setState(prev => ({
      ...prev,
      currentTime: 0,
      isPlaying: false,
      isLoading: true,
    }));
    setCurrentVerse(1);
    currentVerseRef.current = 1;

    const handleLoadedMetadata = () => {
      // Restore playback speed from ref
      audio.playbackRate = speedRef.current;
      
      setState(prev => ({
        ...prev,
        duration: audio.duration,
        isLoading: false,
      }));
    };

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));

      // Update current verse based on timestamp
      const verse = verseTimestampsRef.current.find(
        v => audio.currentTime >= v.start && audio.currentTime < v.end
      );
      if (verse && verse.verse !== currentVerseRef.current) {
        currentVerseRef.current = verse.verse;
        setCurrentVerse(verse.verse);
        onVerseChangeRef.current?.(verse.verse);
      }
    };

    const handleEnded = () => {
      if (repeatRef.current) {
        audio.currentTime = 0;
        audio.play();
      } else {
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    };

    const handleError = (e: Event) => {
      console.error('Audio loading error:', e);
      console.error('Failed audio URL:', audioUrl);
      setState(prev => ({
        ...prev,
        error: 'Failed to load audio',
        isLoading: false,
      }));
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  const play = useCallback(() => {
    if (audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Playback failed:', error);
          setState(prev => ({ ...prev, isPlaying: false }));
        });
      }
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
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
      speedRef.current = speed;
      setState(prev => ({ ...prev, speed }));
    }
  }, []);

  const seekToVerse = useCallback((verseNumber: number) => {
    const verse = verseTimestampsRef.current.find(v => v.verse === verseNumber);
    if (verse) {
      seek(verse.start);
    }
  }, [seek]);

  const nextVerse = useCallback(() => {
    const nextVerseNum = currentVerse + 1;
    const verse = verseTimestampsRef.current.find(v => v.verse === nextVerseNum);
    if (verse) {
      seek(verse.start);
    }
  }, [currentVerse, seek]);

  const previousVerse = useCallback(() => {
    const prevVerseNum = Math.max(1, currentVerse - 1);
    const verse = verseTimestampsRef.current.find(v => v.verse === prevVerseNum);
    if (verse) {
      seek(verse.start);
    }
  }, [currentVerse, seek]);

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
