import { useState, useEffect, useRef, useCallback } from 'react';

interface AudioPlayerState {
  isPlaying: boolean;
  speed: number;
  isLoading: boolean;
  error: string | null;
  currentVerse: number;
}

/**
 * Hook for verse-by-verse audio playback
 * Each verse is a separate audio file from EveryAyah.com
 */
export function useAudioPlayer(
  getAudioUrl: (verse: number) => string,
  totalVerses: number,
  initialVerse: number = 1,
  repeat: boolean = false,
  onVerseChange?: (verse: number) => void,
  onEnded?: () => void
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatRef = useRef(repeat);
  const onVerseChangeRef = useRef(onVerseChange);
  const onEndedRef = useRef(onEnded);
  const speedRef = useRef(1.0);

  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    speed: 1.0,
    isLoading: true,
    error: null,
    currentVerse: initialVerse,
  });

  // Update refs when props change
  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  useEffect(() => {
    onVerseChangeRef.current = onVerseChange;
  }, [onVerseChange]);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  // Load a specific verse
  const loadVerse = useCallback((verseNum: number, shouldPlay: boolean = false) => {
    if (verseNum < 1 || verseNum > totalVerses) {
      console.warn(`Verse ${verseNum} out of range (1-${totalVerses})`);
      return;
    }

    console.log(`🎵 Loading verse ${verseNum}/${totalVerses}`);

    // Clean up previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      // Don't set src to '' as it triggers errors - just let it be garbage collected
    }

    // Update state
    setState(prev => ({
      ...prev,
      currentVerse: verseNum,
      isLoading: true,
      error: null,
    }));

    // Create new audio element
    const audio = new Audio();
    const audioUrl = getAudioUrl(verseNum);
    
    console.log(`📍 Audio URL: ${audioUrl}`);

    // Event handlers
    const handleCanPlay = () => {
      console.log(`✓ Verse ${verseNum} loaded and ready`);
      setState(prev => ({ ...prev, isLoading: false }));
      
      if (shouldPlay) {
        audio.play().catch(err => {
          console.error('Failed to play:', err);
          setState(prev => ({ 
            ...prev, 
            isPlaying: false,
            error: 'Playback failed'
          }));
        });
      }
    };

    const handlePlay = () => {
      console.log(`▶️ Playing verse ${verseNum}`);
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      console.log(`⏸️ Paused verse ${verseNum}`);
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleEnded = () => {
      console.log(`✓ Verse ${verseNum} finished`);
      
      if (repeatRef.current) {
        // Repeat current verse
        audio.currentTime = 0;
        audio.play();
      } else if (verseNum < totalVerses) {
        // Move to next verse
        const nextVerse = verseNum + 1;
        onVerseChangeRef.current?.(nextVerse);
        loadVerse(nextVerse, true);
      } else {
        // Chapter finished
        console.log('📖 Chapter complete');
        setState(prev => ({ ...prev, isPlaying: false }));
        onEndedRef.current?.();
      }
    };

    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      const error = target.error;
      
      console.error('❌ Audio error for verse', verseNum);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      console.error('URL:', audioUrl);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
        error: `Failed to load verse ${verseNum}`,
      }));
    };

    // Attach event listeners
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Set source and load
    audio.src = audioUrl;
    audio.playbackRate = speedRef.current;
    audio.load();

    // Store reference
    audioRef.current = audio;

    // Cleanup function
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [getAudioUrl, totalVerses]);

  // Initialize with first verse
  useEffect(() => {
    const cleanup = loadVerse(initialVerse, false);
    return cleanup;
  }, [initialVerse, loadVerse]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) {
      console.warn('No audio element');
      return;
    }

    if (state.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Playback failed:', err);
        setState(prev => ({ ...prev, error: 'Playback failed' }));
      });
    }
  }, [state.isPlaying]);

  // Jump to specific verse
  const seekToVerse = useCallback((verseNum: number) => {
    if (verseNum < 1 || verseNum > totalVerses) {
      console.warn(`Verse ${verseNum} out of range`);
      return;
    }

    const wasPlaying = state.isPlaying;
    onVerseChangeRef.current?.(verseNum);
    loadVerse(verseNum, wasPlaying);
  }, [loadVerse, totalVerses, state.isPlaying]);

  // Next verse
  const nextVerse = useCallback(() => {
    if (state.currentVerse < totalVerses) {
      seekToVerse(state.currentVerse + 1);
    }
  }, [state.currentVerse, totalVerses, seekToVerse]);

  // Previous verse
  const prevVerse = useCallback(() => {
    if (state.currentVerse > 1) {
      seekToVerse(state.currentVerse - 1);
    }
  }, [state.currentVerse, seekToVerse]);

  // Set playback speed
  const setSpeed = useCallback((newSpeed: number) => {
    speedRef.current = newSpeed;
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
    setState(prev => ({ ...prev, speed: newSpeed }));
    console.log(`⚡ Speed: ${newSpeed}x`);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  return {
    ...state,
    togglePlayPause,
    seekToVerse,
    nextVerse,
    prevVerse,
    setSpeed,
  };
}
