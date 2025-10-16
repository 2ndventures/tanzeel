import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  isLoading: boolean;
  error: string | null;
  currentVerse: number;
  isInVerseRange: boolean;
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
  repeat: boolean = false,
  onEnded?: () => void
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentVerseRef = useRef<number>(0); // Start with preamble (verse 0)
  const onVerseChangeRef = useRef(onVerseChange);
  const onEndedRef = useRef(onEnded);
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
    currentVerse: 0, // Start with preamble (verse 0)
    isInVerseRange: true, // Start true - we know time 0 is in preamble range
  });

  // Keep refs up to date
  useEffect(() => {
    onVerseChangeRef.current = onVerseChange;
  }, [onVerseChange]);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

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
      currentVerse: 0, // Start with preamble (verse 0)
      isInVerseRange: true, // Start true - time 0 is in preamble range
      error: null, // Clear any previous errors when loading new audio
    }));
    currentVerseRef.current = 0;

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
      const currentTime = audio.currentTime;
      
      // Update current verse based on timestamp
      const verse = verseTimestampsRef.current.find(
        v => currentTime >= v.start && currentTime < v.end
      );
      
      if (verse) {
        // We're in a valid verse timestamp range
        const verseChanged = verse.verse !== currentVerseRef.current;
        
        if (verseChanged) {
          currentVerseRef.current = verse.verse;
          
          // Atomic state update - all changes in one setState call
          // IMPORTANT: Maintain isPlaying state during verse changes
          setState(prev => ({ 
            ...prev, 
            currentTime, 
            currentVerse: verse.verse,
            isInVerseRange: true,
            isPlaying: !audio.paused, // Sync with actual audio state
          }));
          
          onVerseChangeRef.current?.(verse.verse);
          
          // Log verse changes to help verify timing sync
          const verseLabel = verse.verse === 0 ? 'Preamble' : `Verse ${verse.verse}`;
          console.log(`✓ ${verseLabel} highlighting at ${currentTime.toFixed(1)}s (expected: ${verse.start}-${verse.end}s)`);
        } else {
          // Same verse, just update time and sync isPlaying
          setState(prev => ({ ...prev, currentTime, isPlaying: !audio.paused }));
        }
      } else {
        // We're in a gap (no timestamp defined) - turn off highlighting but keep currentVerse for navigation
        setState(prev => ({ ...prev, currentTime, isInVerseRange: false, isPlaying: !audio.paused }));
      }
    };

    const handleEnded = () => {
      if (repeatRef.current) {
        audio.currentTime = 0;
        audio.play();
      } else {
        setState(prev => ({ ...prev, isPlaying: false }));
        // Call onEnded callback if provided (for auto-play next surah)
        onEndedRef.current?.();
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
      // Immediately check which verse we're in when playback starts
      // This ensures we don't miss the preamble if timeUpdate fires late
      const currentTime = audio.currentTime;
      const verse = verseTimestampsRef.current.find(
        v => currentTime >= v.start && currentTime < v.end
      );
      
      if (verse) {
        const verseChanged = verse.verse !== currentVerseRef.current;
        currentVerseRef.current = verse.verse;
        
        // Update state with verse info and isPlaying=true in single atomic update
        setState(prev => ({ 
          ...prev, 
          currentTime, 
          currentVerse: verse.verse,
          isInVerseRange: true,
          isPlaying: true,
        }));
        
        // Only call onVerseChange and log if verse actually changed
        if (verseChanged) {
          onVerseChangeRef.current?.(verse.verse);
          
          const verseLabel = verse.verse === 0 ? 'Preamble' : `Verse ${verse.verse}`;
          console.log(`✓ ${verseLabel} highlighting at ${currentTime.toFixed(1)}s (expected: ${verse.start}-${verse.end}s) [on play]`);
        }
      } else {
        // No verse found, just set isPlaying
        setState(prev => ({ ...prev, isPlaying: true }));
      }
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
    const nextVerseNum = state.currentVerse + 1;
    const verse = verseTimestampsRef.current.find(v => v.verse === nextVerseNum);
    if (verse) {
      seek(verse.start);
    }
  }, [state.currentVerse, seek]);

  const previousVerse = useCallback(() => {
    // Allow going back to verse 0 (preamble) if it exists
    const prevVerseNum = Math.max(0, state.currentVerse - 1);
    const verse = verseTimestampsRef.current.find(v => v.verse === prevVerseNum);
    if (verse) {
      seek(verse.start);
    }
  }, [state.currentVerse, seek]);

  return {
    ...state,
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
