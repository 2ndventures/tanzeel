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
  getAudioUrl: (verse: number) => string, // Function to get audio URL for a specific verse
  totalVerses: number, // Total number of verses in the chapter
  initialVerse: number = 1, // Starting verse (default 1)
  repeat: boolean = false,
  onVerseChange?: (verse: number) => void,
  onEnded?: () => void // Called when all verses are finished
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentVerseRef = useRef<number>(initialVerse);
  const onVerseChangeRef = useRef(onVerseChange);
  const onEndedRef = useRef(onEnded);
  const repeatRef = useRef(repeat);
  const speedRef = useRef(1.0);
  const isPlayingRef = useRef(false); // Track intended playback state
  
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    speed: 1.0,
    isLoading: false,
    error: null,
    currentVerse: initialVerse,
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

  // Load and play a specific verse
  const loadVerse = useCallback((verseNum: number, autoPlay: boolean = false) => {
    if (verseNum < 1 || verseNum > totalVerses) {
      console.warn(`Verse ${verseNum} out of range (1-${totalVerses})`);
      return;
    }

    const audioUrl = getAudioUrl(verseNum);
    console.log(`🎵 Loading verse ${verseNum}`);
    console.log(`📍 Audio URL: ${audioUrl}`);
    console.log(`📍 URL type: ${typeof audioUrl}`);
    console.log(`📍 URL length: ${audioUrl?.length}`);

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      currentVerse: verseNum,
    }));

    // Create new audio element
    const audio = new Audio();
    audio.preload = 'auto';
    audio.playbackRate = speedRef.current;
    
    // Set up event listeners BEFORE setting src
    const handleCanPlayThrough = () => {
      console.log(`✓ Verse ${verseNum} ready to play`);
      console.log(`📍 Audio element src after loading: ${audio.src}`);
      setState(prev => ({ ...prev, isLoading: false }));
      
      if (autoPlay && isPlayingRef.current) {
        audio.play().catch(err => {
          console.error('Auto-play failed:', err);
          setState(prev => ({ ...prev, isPlaying: false, error: 'Playback failed' }));
          isPlayingRef.current = false;
        });
      }
    };

    const handleEnded = () => {
      console.log(`✓ Verse ${verseNum} finished`);
      
      if (repeatRef.current) {
        audio.currentTime = 0;
        audio.play();
      } else if (verseNum < totalVerses) {
        onVerseChangeRef.current?.(verseNum + 1);
        loadVerse(verseNum + 1, isPlayingRef.current);
      } else {
        console.log('📖 Chapter finished');
        setState(prev => ({ ...prev, isPlaying: false }));
        isPlayingRef.current = false;
        onEndedRef.current?.();
      }
    };

    const handleError = (e: Event) => {
      const audio = e.target as HTMLAudioElement;
      const errorDetails = audio.error;
      console.error('Audio loading error for verse', verseNum);
      console.error('Failed audio URL:', audioUrl);
      console.error('Error code:', errorDetails?.code);
      console.error('Error message:', errorDetails?.message);
      console.error('Network state:', audio.networkState);
      console.error('Ready state:', audio.readyState);
      console.error('Audio src:', audio.src);
      
      let errorMessage = `Failed to load verse ${verseNum}`;
      if (errorDetails) {
        switch (errorDetails.code) {
          case 1:
            errorMessage = 'Audio loading aborted';
            break;
          case 2:
            errorMessage = 'Network error loading audio';
            break;
          case 3:
            errorMessage = 'Audio decoding error';
            break;
          case 4:
            errorMessage = 'Audio format not supported';
            break;
        }
      }
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
        isPlaying: false,
      }));
      isPlayingRef.current = false;
    };
    
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    // Clean up old audio
    if (audioRef.current) {
      console.log('📍 Cleaning up old audio element');
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    // Set src and start loading
    console.log('📍 About to set audio.src to:', audioUrl);
    audio.src = audioUrl;
    console.log('📍 After setting src, audio.src is:', audio.src);
    console.log('📍 Calling audio.load()');
    audio.load();
    console.log('📍 After audio.load(), audio.src is:', audio.src);
    console.log('📍 Audio element:', audio);
    
    audioRef.current = audio;
    currentVerseRef.current = verseNum;

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [getAudioUrl, totalVerses]);

  // Initialize with first verse
  useEffect(() => {
    loadVerse(initialVerse, false);
  }, [initialVerse, loadVerse]);

  // Play/pause
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) {
      console.warn('No audio element available');
      return;
    }

    if (state.isPlaying) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
      isPlayingRef.current = false;
      console.log('⏸️ Paused');
    } else {
      audioRef.current.play().catch(err => {
        console.error('Playback failed:', err);
        setState(prev => ({ ...prev, error: 'Playback failed' }));
      });
      setState(prev => ({ ...prev, isPlaying: true }));
      isPlayingRef.current = true;
      console.log('▶️ Playing');
    }
  }, [state.isPlaying]);

  // Jump to a specific verse
  const seekToVerse = useCallback((verseNum: number) => {
    if (verseNum < 1 || verseNum > totalVerses) {
      console.warn(`Verse ${verseNum} out of range`);
      return;
    }

    console.log(`⏭️ Jumping to verse ${verseNum}`);
    const wasPlaying = isPlayingRef.current;
    
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Load new verse
    onVerseChangeRef.current?.(verseNum);
    loadVerse(verseNum, wasPlaying);
  }, [loadVerse, totalVerses]);

  // Next verse
  const nextVerse = useCallback(() => {
    if (currentVerseRef.current < totalVerses) {
      seekToVerse(currentVerseRef.current + 1);
    }
  }, [totalVerses, seekToVerse]);

  // Previous verse
  const prevVerse = useCallback(() => {
    if (currentVerseRef.current > 1) {
      seekToVerse(currentVerseRef.current - 1);
    }
  }, [seekToVerse]);

  // Set playback speed
  const setSpeed = useCallback((newSpeed: number) => {
    speedRef.current = newSpeed;
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
    setState(prev => ({ ...prev, speed: newSpeed }));
    console.log(`⚡ Playback speed: ${newSpeed}x`);
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
