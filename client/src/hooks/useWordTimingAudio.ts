import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { API_BASE_URL } from '@/config';

// Helper functions for global speed persistence
const GLOBAL_SPEED_KEY = 'quran-playback-speed';
const OLD_CHAPTER_SPEEDS_KEY = 'quran-chapter-speeds';

// Migrate from old per-chapter speeds to global speed (one-time cleanup)
function migrateOldSpeedData(): void {
  try {
    const oldData = localStorage.getItem(OLD_CHAPTER_SPEEDS_KEY);
    if (oldData) {
      localStorage.removeItem(OLD_CHAPTER_SPEEDS_KEY);
    }
  } catch (error) {
    console.error('Failed to migrate old speed data:', error);
  }
}

function getGlobalSpeed(): number | null {
  try {
    // One-time migration
    migrateOldSpeedData();
    
    const saved = localStorage.getItem(GLOBAL_SPEED_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
      // Validate that the parsed value is a finite number
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to load global speed:', error);
  }
  return null;
}

function setGlobalSpeed(speed: number): void {
  try {
    localStorage.setItem(GLOBAL_SPEED_KEY, speed.toString());
  } catch (error) {
    console.error('Failed to save global speed:', error);
  }
}

export interface WordSegment {
  timestamp_from: number;
  timestamp_to: number;
  segments: [number, number, number][]; // Array of [wordIndex, startMs, endMs]
  verse_key: string;
}

export interface AudioFile {
  id: number;
  chapter_id: number;
  file_size: number;
  format: string;
  audio_url: string;
  verse_timings: WordSegment[];
}

export interface TimingData {
  audio_files: AudioFile[];
}

interface WordTimingAudioState {
  isPlaying: boolean;
  speed: number;
  isLoading: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  currentVerseKey: string | null;
  currentWordIndex: number | null;
}

export function useWordTimingAudio(
  chapterId: number,
  reciterId: number = 7,
  repeat: boolean = false,
  onVerseChange?: (verseKey: string) => void,
  onEnded?: () => void,
  initialSpeed: number = 1.0,
  autoplay: boolean = false
) {
  // Load saved global speed, or use Settings default
  const savedSpeed = getGlobalSpeed();
  const effectiveSpeed = savedSpeed ?? initialSpeed;
  
  // CRITICAL FIX: Use a ref to the DOM audio element instead of new Audio()
  // This works in mobile WebViews (iOS/Android) unlike the headless Audio() constructor
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  
  const repeatRef = useRef(repeat);
  const onVerseChangeRef = useRef(onVerseChange);
  const onEndedRef = useRef(onEnded);
  const speedRef = useRef(effectiveSpeed);
  const autoplayRef = useRef(autoplay);
  const timingDataRef = useRef<AudioFile | null>(null);

  const [state, setState] = useState<WordTimingAudioState>({
    isPlaying: false,
    speed: effectiveSpeed,
    isLoading: true,
    error: null,
    currentTime: 0,
    duration: 0,
    currentVerseKey: null,
    currentWordIndex: null,
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

  useEffect(() => {
    autoplayRef.current = autoplay;
  }, [autoplay]);

  // Sync speedRef with saved global speed before loadAudio runs
  // This ensures the audio element gets the correct speed when created
  const syncSpeed = useCallback(() => {
    const savedSpeed = getGlobalSpeed();
    const newSpeed = savedSpeed ?? initialSpeed;
    
    speedRef.current = newSpeed;
    setState(prev => ({ ...prev, speed: newSpeed }));
    
    return newSpeed;
  }, [initialSpeed]);

  // Find current verse and word based on playback time
  const findCurrentSegment = useCallback((currentTime: number) => {
    if (!timingDataRef.current) return { verseKey: null, wordIndex: null };

    const timings = timingDataRef.current.verse_timings;
    const currentTimeMs = currentTime * 1000; // Convert to milliseconds
    
    for (const timing of timings) {
      if (currentTimeMs >= timing.timestamp_from && currentTimeMs <= timing.timestamp_to) {
        const verseSegments = timing.segments;
        
        // Segments are arrays: [wordIndex, startMs, endMs]
        // Handle empty segments array (no word-level timing available)
        if (verseSegments.length === 0) {
          return { verseKey: timing.verse_key, wordIndex: null };
        }
        
        for (let i = 0; i < verseSegments.length; i++) {
          const segment = verseSegments[i];
          // segment is [wordIndex, startMs, endMs]
          // API uses 1-based indexing, convert to 0-based for array access
          const wordIndex = segment[0] - 1;  // Convert 1-based to 0-based
          const wordStart = segment[1];      // start timestamp in ms
          const wordEnd = segment[2];        // end timestamp in ms
          
          if (currentTimeMs >= wordStart && currentTimeMs <= wordEnd) {
            return { verseKey: timing.verse_key, wordIndex };
          }
        }
        
        // If we're in the verse but not on a specific word, use the last word's canonical index
        const lastSegment = verseSegments[verseSegments.length - 1];
        return { 
          verseKey: timing.verse_key, 
          wordIndex: lastSegment ? lastSegment[0] - 1 : null  // Convert 1-based to 0-based
        };
      }
    }

    return { verseKey: null, wordIndex: null };
  }, []);

  // Load timing data and audio
  const loadAudio = useCallback(async () => {
    try {
      console.log('🔄 loadAudio called for chapter', chapterId, 'with API_BASE_URL:', API_BASE_URL);
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Sync speed before creating audio element
      syncSpeed();

      // Fetch timing data from our backend proxy
      const timingUrl = `${API_BASE_URL}/api/audio-timing/${reciterId}/${chapterId}`;
      console.log('📡 Fetching timing data from:', timingUrl);
      
      const timingResponse = await fetch(timingUrl);
      
      if (!timingResponse.ok) {
        const errorText = await timingResponse.text().catch(() => 'Unable to read error');
        console.error('❌ Timing fetch failed:', timingResponse.status, timingResponse.statusText);
        console.error('❌ Response body:', errorText);
        throw new Error(`Timing API returned ${timingResponse.status}: ${errorText}`);
      }

      console.log('✅ Timing data received, status:', timingResponse.status);
      const timingData: TimingData = await timingResponse.json();
      // Backend normalizes both API formats to always return audio_files array
      // But add defensive checks in case of unexpected responses
      if (!timingData.audio_files || !Array.isArray(timingData.audio_files) || timingData.audio_files.length === 0) {
        console.error('❌ Invalid timing data structure:', timingData);
        throw new Error('No audio files found in timing data');
      }
      
      console.log('✅ Timing data parsed, audio files:', timingData.audio_files.length);
      
      const audioFile = timingData.audio_files[0];
      
      if (!audioFile) {
        throw new Error('Audio file data is missing');
      }
      
      console.log('✅ Audio file loaded:', {
        id: audioFile.id,
        chapterId: audioFile.chapter_id,
        url: audioFile.audio_url,
        hasTimings: !!audioFile.verse_timings,
        timingsCount: audioFile.verse_timings?.length
      });
      
      timingDataRef.current = audioFile;

      // CRITICAL FIX: Create audio element in DOM instead of using new Audio()
      // This works in mobile WebViews (iOS/Android)
      
      // Create container div if it doesn't exist
      if (!audioContainerRef.current) {
        const container = document.createElement('div');
        container.style.display = 'none'; // Hide from UI
        container.id = `quran-audio-player-${chapterId}`;
        document.body.appendChild(container);
        audioContainerRef.current = container;
      }

      // Create audio element in DOM
      const audio = document.createElement('audio');
      // Use 'metadata' preload for large files - only loads metadata, not entire file
      // This prevents timeout/premature close errors on 110MB+ files
      audio.preload = 'metadata';
      // Remove crossOrigin since we're proxying through our backend - no CORS needed
      audioContainerRef.current.appendChild(audio);

      let audioUrl = audioFile.audio_url || (audioFile as any).audio_file?.audio_url;
      
      if (!audioUrl) {
        throw new Error('No audio URL found in timing data');
      }
      
      // The audio URL is now a direct CDN URL (https://download.quranicaudio.com/...)
      // No need to prepend API_BASE_URL since we're using the CDN directly
      // This avoids backend proxy timeout issues with large files (110MB+)

      console.log('🎵 Loading audio from:', audioUrl);
      console.log('📊 Audio URL breakdown:', {
        API_BASE_URL,
        originalUrl: audioFile.audio_url,
        finalUrl: audioUrl,
        isDev: import.meta.env.DEV,
        isNative: Capacitor.isNativePlatform()
      });

      // Add debugging event listeners first
      audio.addEventListener('loadstart', () => {
        console.log('🔵 Audio load started');
        console.log('🔵 Network state:', audio.networkState, 'Ready state:', audio.readyState);
      });
      audio.addEventListener('progress', () => {
        console.log('📥 Loading progress... network state:', audio.networkState);
      });
      audio.addEventListener('loadedmetadata', () => console.log('🟢 Metadata loaded'));
      audio.addEventListener('canplay', () => console.log('✅ Audio can play'));
      audio.addEventListener('error', (e) => {
        console.error('❌ Audio Error Details:', {
          errorCode: audio.error?.code,
          errorMessage: audio.error?.message,
          networkState: audio.networkState,
          readyState: audio.readyState,
          src: audio.src,
          crossOrigin: audio.crossOrigin
        });
        console.error('❌ Error codes: 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED');
        console.error('❌ Network states: 0=EMPTY, 1=IDLE, 2=LOADING, 3=NO_SOURCE');
      });

      // Event handlers
      const handleLoadedMetadata = () => {
        console.log('✅ Audio metadata loaded, duration:', audio.duration);
        setState(prev => ({ 
          ...prev, 
          duration: audio.duration || 0,
          currentTime: 0
        }));
      };

      const handleTimeUpdate = () => {
        const currentTime = audio.currentTime;
        const { verseKey, wordIndex } = findCurrentSegment(currentTime);
        
        setState(prev => {
          // Only trigger onVerseChange if verse actually changed
          if (verseKey && verseKey !== prev.currentVerseKey) {
            onVerseChangeRef.current?.(verseKey);
          }
          
          return {
            ...prev,
            currentTime,
            currentVerseKey: verseKey,
            currentWordIndex: wordIndex,
          };
        });
      };

      const handleCanPlay = () => {
        console.log('✅ Audio can play');
        // Set playback rate after audio is ready (some browsers reset it during load())
        audio.playbackRate = speedRef.current;
        
        // Auto-start playback if autoplay is enabled
        if (autoplayRef.current) {
          setState(prev => ({ ...prev, isLoading: false }));
          audio.play().catch(err => {
            console.error('❌ Autoplay failed:', err);
            setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false, isPlaying: false }));
        }
      };

      const handlePlay = () => {
        console.log('▶️ Audio playing');
        setState(prev => ({ ...prev, isPlaying: true }));
      };

      const handlePause = () => {
        console.log('⏸️ Audio paused');
        // Keep current verse and word highlighting when paused
        setState(prev => ({ 
          ...prev, 
          isPlaying: false
          // Preserve currentVerseKey and currentWordIndex
        }));
      };

      const handleEnded = () => {
        console.log('⏹️ Audio ended');
        
        if (repeatRef.current) {
          audio.currentTime = 0;
          audio.play();
        } else {
          setState(prev => ({ ...prev, isPlaying: false }));
          onEndedRef.current?.();
        }
      };

      const handleError = (e: Event) => {
        const target = e.target as HTMLAudioElement;
        const error = target.error;
        
        console.error('❌ Audio error for chapter', chapterId);
        console.error('Error code:', error?.code);
        console.error('Error message:', error?.message);
        console.error('Error URL:', audioUrl);
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          isPlaying: false,
          error: `Failed to load chapter ${chapterId}`,
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
        audio.pause();
        audio.src = '';
        audio.remove();
      };
    } catch (error) {
      console.error('❌ Failed to load audio:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        chapterId,
        reciterId,
        API_BASE_URL
      });
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load audio',
      }));
    }
  }, [chapterId, reciterId, syncSpeed, findCurrentSegment]);

  // Initialize audio on mount
  useEffect(() => {
    const cleanup = loadAudio();
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [loadAudio]);

  // Cleanup container on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.remove();
      }
      if (audioContainerRef.current) {
        audioContainerRef.current.remove();
        audioContainerRef.current = null;
      }
    };
  }, []);

  // Dedicated pause function
  const pauseAudio = useCallback(() => {
    if (audioRef.current && state.isPlaying) {
      audioRef.current.pause();
    }
  }, [state.isPlaying]);

  // Dedicated play function
  const playAudio = useCallback(() => {
    if (!audioRef.current) {
      console.warn('⚠️ No audio element - still loading');
      return;
    }
    
    if (!state.isPlaying) {
      console.log('▶️ Attempting to play audio...');
      audioRef.current.play().catch(err => {
        console.error('❌ Playback failed:', err);
        setState(prev => ({ ...prev, error: 'Playback failed' }));
      });
    }
  }, [state.isPlaying]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) {
      console.warn('⚠️ No audio element - still loading');
      return;
    }

    if (state.isPlaying) {
      console.log('⏸️ Pausing audio...');
      audioRef.current.pause();
    } else {
      console.log('▶️ Playing audio...');
      audioRef.current.play().catch(err => {
        console.error('❌ Playback failed:', err);
        setState(prev => ({ ...prev, error: 'Playback failed' }));
      });
    }
  }, [state.isPlaying]);

  // Seek to specific time
  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(prev => ({ ...prev, currentTime: time }));
    }
  }, []);

  // Seek to specific verse
  const seekToVerse = useCallback((verseKey: string) => {
    if (!timingDataRef.current) return;

    const verseTiming = timingDataRef.current.verse_timings.find(
      t => t.verse_key === verseKey
    );

    if (verseTiming && audioRef.current) {
      const seekTime = verseTiming.timestamp_from / 1000;
      audioRef.current.currentTime = seekTime;
      
      // Immediately update state to reflect the new position
      // This ensures UI updates even in iframe contexts where timeupdate may be delayed
      const { verseKey: newVerseKey, wordIndex: newWordIndex } = findCurrentSegment(seekTime);
      setState(prev => ({
        ...prev,
        currentTime: seekTime,
        currentVerseKey: newVerseKey,
        currentWordIndex: newWordIndex,
      }));
    }
  }, [findCurrentSegment]);

  // Set playback speed and save globally to localStorage
  const setSpeed = useCallback((newSpeed: number) => {
    speedRef.current = newSpeed;
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
    setState(prev => ({ ...prev, speed: newSpeed }));
    setGlobalSpeed(newSpeed); // Save globally to localStorage
  }, []);

  // Get timing data (returns the audio file with verse timings)
  const getTimingData = useCallback((): AudioFile | null => {
    return timingDataRef.current;
  }, []);

  return {
    ...state,
    togglePlayPause,
    pauseAudio,
    playAudio,
    seek,
    seekToVerse,
    setSpeed,
    getTimingData,
  };
}
