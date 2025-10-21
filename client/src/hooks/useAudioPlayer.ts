import { useState, useEffect, useRef, useCallback } from 'react';
import { WebAudioPlayer } from '@/lib/WebAudioPlayer';

interface AudioPlayerState {
  isPlaying: boolean;
  speed: number;
  isLoading: boolean;
  error: string | null;
  currentVerse: number;
  currentTime: number;
  duration: number;
}

/**
 * Hook for verse-by-verse audio playback with smooth transitions
 * Uses Web Audio API with crossfading when supported, falls back to HTML Audio
 */
export function useAudioPlayer(
  getAudioUrl: (verse: number) => string,
  totalVerses: number,
  initialVerse: number = 1,
  repeat: boolean = false,
  onVerseChange?: (verse: number) => void,
  onEnded?: () => void
) {
  const webPlayerRef = useRef<WebAudioPlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const repeatRef = useRef(repeat);
  const onVerseChangeRef = useRef(onVerseChange);
  const onEndedRef = useRef(onEnded);
  const speedRef = useRef(1.0);
  const useWebAudio = useRef(WebAudioPlayer.isSupported());

  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    speed: 1.0,
    isLoading: true,
    error: null,
    currentVerse: initialVerse,
    currentTime: 0,
    duration: 0,
  });

  console.log(`🎧 Audio player mode: ${useWebAudio.current ? 'Web Audio API (smooth crossfade)' : 'HTML Audio (fallback)'}`);

  // Update refs when props change
  useEffect(() => {
    repeatRef.current = repeat;
    if (webPlayerRef.current) {
      webPlayerRef.current.setRepeat(repeat);
    }
  }, [repeat]);

  useEffect(() => {
    onVerseChangeRef.current = onVerseChange;
  }, [onVerseChange]);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  // Initialize Web Audio Player if supported
  useEffect(() => {
    if (!useWebAudio.current) return;

    const player = new WebAudioPlayer({
      getAudioUrl,
      totalVerses,
      onVerseChange: (verse) => {
        setState(prev => ({ ...prev, currentVerse: verse }));
        onVerseChangeRef.current?.(verse);
      },
      onEnded: () => {
        setState(prev => ({ ...prev, isPlaying: false }));
        onEndedRef.current?.();
      },
      onTimeUpdate: (currentTime, duration) => {
        setState(prev => ({ ...prev, currentTime, duration }));
      },
      onPlayStateChange: (isPlaying) => {
        setState(prev => ({ ...prev, isPlaying }));
      },
      onLoadingChange: (isLoading) => {
        setState(prev => ({ ...prev, isLoading }));
      },
      onError: (error) => {
        setState(prev => ({ ...prev, error, isLoading: false }));
      }
    });

    player.setRepeat(repeat);
    webPlayerRef.current = player;

    // Load initial verse
    player.seekToVerse(initialVerse).then(() => {
      player.getDuration().then(duration => {
        setState(prev => ({ ...prev, duration, isLoading: false }));
      });
    });

    return () => {
      player.destroy();
    };
  }, [getAudioUrl, totalVerses, initialVerse, repeat]);

  // HTML Audio fallback implementation
  const loadVerse = useCallback((verseNum: number, shouldPlay: boolean = false) => {
    if (useWebAudio.current) return; // Skip if using Web Audio
    
    if (verseNum < 1 || verseNum > totalVerses) {
      console.warn(`Verse ${verseNum} out of range (1-${totalVerses})`);
      return;
    }

    console.log(`🎵 Loading verse ${verseNum}/${totalVerses}`);

    // Clean up previous audio
    if (audioRef.current) {
      audioRef.current.pause();
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
    const handleLoadedMetadata = () => {
      setState(prev => ({ 
        ...prev, 
        duration: audio.duration || 0,
        currentTime: 0
      }));
    };

    const handleTimeUpdate = () => {
      setState(prev => ({ 
        ...prev, 
        currentTime: audio.currentTime 
      }));
    };

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
      
      // Preload next verse for seamless playback
      if (verseNum < totalVerses && !repeatRef.current) {
        const nextVerseNum = verseNum + 1;
        const nextUrl = getAudioUrl(nextVerseNum);
        
        // Clean up old preload
        if (preloadRef.current) {
          preloadRef.current.pause();
          preloadRef.current.src = '';
        }
        
        // Create new preload audio
        const preloadAudio = new Audio();
        preloadAudio.src = nextUrl;
        preloadAudio.playbackRate = speedRef.current;
        preloadAudio.load();
        preloadRef.current = preloadAudio;
        
        console.log(`⏩ Preloading verse ${nextVerseNum} for seamless playback`);
      }
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
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
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
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [getAudioUrl, totalVerses]);

  // Initialize HTML Audio with first verse (fallback mode only)
  useEffect(() => {
    if (useWebAudio.current) return;
    
    const cleanup = loadVerse(initialVerse, false);
    return cleanup;
  }, [initialVerse, loadVerse]);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (useWebAudio.current && webPlayerRef.current) {
      // Web Audio mode
      if (state.isPlaying) {
        webPlayerRef.current.pause();
      } else {
        await webPlayerRef.current.play();
      }
    } else {
      // HTML Audio fallback
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
    }
  }, [state.isPlaying]);

  // Jump to specific verse
  const seekToVerse = useCallback(async (verseNum: number) => {
    if (verseNum < 1 || verseNum > totalVerses) {
      console.warn(`Verse ${verseNum} out of range`);
      return;
    }

    if (useWebAudio.current && webPlayerRef.current) {
      // Web Audio mode
      await webPlayerRef.current.seekToVerse(verseNum);
    } else {
      // HTML Audio fallback
      const wasPlaying = state.isPlaying;
      onVerseChangeRef.current?.(verseNum);
      loadVerse(verseNum, wasPlaying);
    }
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
    
    if (useWebAudio.current && webPlayerRef.current) {
      // Web Audio mode
      webPlayerRef.current.setSpeed(newSpeed);
    } else {
      // HTML Audio fallback
      if (audioRef.current) {
        audioRef.current.playbackRate = newSpeed;
      }
      if (preloadRef.current) {
        preloadRef.current.playbackRate = newSpeed;
      }
    }
    
    setState(prev => ({ ...prev, speed: newSpeed }));
    console.log(`⚡ Speed: ${newSpeed}x`);
  }, []);

  // Seek within current verse
  const seek = useCallback(async (time: number) => {
    if (useWebAudio.current && webPlayerRef.current) {
      // Web Audio mode
      await webPlayerRef.current.seek(time);
    } else {
      // HTML Audio fallback
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        setState(prev => ({ ...prev, currentTime: time }));
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (useWebAudio.current && webPlayerRef.current) {
        webPlayerRef.current.destroy();
      } else {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        if (preloadRef.current) {
          preloadRef.current.pause();
          preloadRef.current.src = '';
        }
      }
    };
  }, []);

  return {
    ...state,
    togglePlayPause,
    seek,
    seekToVerse,
    nextVerse,
    prevVerse,
    setSpeed,
  };
}
