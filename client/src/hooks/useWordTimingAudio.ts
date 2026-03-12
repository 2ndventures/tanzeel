import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { API_BASE_URL } from '@/config';
import { getCachedTimingData, cacheTimingData, getCachedAudioUrl, cacheAudioFile } from '@/lib/audioCache';
import { getItem, setItem, removeItem } from '@/lib/storage';

const GLOBAL_SPEED_KEY = 'quran-playback-speed';
const OLD_CHAPTER_SPEEDS_KEY = 'quran-chapter-speeds';

function migrateOldSpeedData(): void {
  try {
    const oldData = getItem(OLD_CHAPTER_SPEEDS_KEY);
    if (oldData) {
      removeItem(OLD_CHAPTER_SPEEDS_KEY);
    }
  } catch (error) {
    console.error('Failed to migrate old speed data:', error);
  }
}

function getGlobalSpeed(): number | null {
  try {
    migrateOldSpeedData();
    
    const saved = getItem(GLOBAL_SPEED_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
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
    setItem(GLOBAL_SPEED_KEY, speed.toString());
  } catch (error) {
    console.error('Failed to save global speed:', error);
  }
}

export interface WordSegment {
  timestamp_from: number;
  timestamp_to: number;
  segments: [number, number, number][];
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
  const savedSpeed = getGlobalSpeed();
  const effectiveSpeed = savedSpeed ?? initialSpeed;
  
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

  const syncSpeed = useCallback(() => {
    const savedSpeed = getGlobalSpeed();
    const newSpeed = savedSpeed ?? initialSpeed;
    
    speedRef.current = newSpeed;
    setState(prev => ({ ...prev, speed: newSpeed }));
    
    return newSpeed;
  }, [initialSpeed]);

  const findCurrentSegment = useCallback((currentTime: number) => {
    if (!timingDataRef.current) return { verseKey: null, wordIndex: null };

    const timings = timingDataRef.current.verse_timings;
    const currentTimeMs = currentTime * 1000;
    
    for (const timing of timings) {
      if (currentTimeMs >= timing.timestamp_from && currentTimeMs <= timing.timestamp_to) {
        const verseSegments = timing.segments;
        
        if (verseSegments.length === 0) {
          return { verseKey: timing.verse_key, wordIndex: null };
        }
        
        for (let i = 0; i < verseSegments.length; i++) {
          const segment = verseSegments[i];
          const wordIndex = segment[0] - 1;
          const wordStart = segment[1];
          const wordEnd = segment[2];
          
          if (currentTimeMs >= wordStart && currentTimeMs <= wordEnd) {
            return { verseKey: timing.verse_key, wordIndex };
          }
        }
        
        const lastSegment = verseSegments[verseSegments.length - 1];
        return { 
          verseKey: timing.verse_key, 
          wordIndex: lastSegment ? lastSegment[0] - 1 : null
        };
      }
    }

    return { verseKey: null, wordIndex: null };
  }, []);

  const loadAudio = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      syncSpeed();

      const timingUrl = `${API_BASE_URL}/api/audio-timing/${reciterId}/${chapterId}`;

      let timingData: TimingData;
      const cachedTiming = await getCachedTimingData(reciterId, chapterId);
      if (cachedTiming) {
        timingData = await cachedTiming.json();
      } else {
        const timingResponse = await fetch(timingUrl);
        
        if (!timingResponse.ok) {
          const errorText = await timingResponse.text().catch(() => 'Unable to read error');
          throw new Error(`Timing API returned ${timingResponse.status}: ${errorText}`);
        }

        const cloned = timingResponse.clone();
        timingData = await timingResponse.json();
        await cacheTimingData(reciterId, chapterId, cloned);
      }
      if (!timingData.audio_files || !Array.isArray(timingData.audio_files) || timingData.audio_files.length === 0) {
        throw new Error('No audio files found in timing data');
      }
      
      const audioFile = timingData.audio_files[0];
      
      if (!audioFile) {
        throw new Error('Audio file data is missing');
      }
      
      timingDataRef.current = audioFile;

      if (!audioContainerRef.current) {
        const container = document.createElement('div');
        container.style.display = 'none';
        container.id = `quran-audio-player-${chapterId}`;
        document.body.appendChild(container);
        audioContainerRef.current = container;
      }

      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audioContainerRef.current.appendChild(audio);

      let audioUrl = audioFile.audio_url || (audioFile as any).audio_file?.audio_url;
      
      if (!audioUrl) {
        throw new Error('No audio URL found in timing data');
      }

      const cachedBlobUrl = await getCachedAudioUrl(reciterId, chapterId);
      const effectiveAudioUrl = cachedBlobUrl || audioUrl;

      if (!cachedBlobUrl) {
        cacheAudioFile(audioUrl, reciterId, chapterId).catch(() => {});
      }

      const handleLoadedMetadata = () => {
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
        audio.playbackRate = speedRef.current;
        
        if (autoplayRef.current) {
          setState(prev => ({ ...prev, isLoading: false }));
          audio.play().catch(() => {
            setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false, isPlaying: false }));
        }
      };

      const handlePlay = () => {
        setState(prev => ({ ...prev, isPlaying: true }));
      };

      const handlePause = () => {
        setState(prev => ({ 
          ...prev, 
          isPlaying: false
        }));
      };

      const handleEnded = () => {
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
        
        if (error) {
          console.error('Audio load error:', error.code, error.message);
        }
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          isPlaying: false,
          error: `Failed to load chapter ${chapterId}`,
        }));
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      audio.src = effectiveAudioUrl;
      audio.playbackRate = speedRef.current;
      audio.load();

      audioRef.current = audio;

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.pause();
        if (cachedBlobUrl) {
          URL.revokeObjectURL(cachedBlobUrl);
        }
        audio.src = '';
        audio.remove();
      };
    } catch (error) {
      console.error('Failed to load audio:', error instanceof Error ? error.message : error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load audio',
      }));
    }
  }, [chapterId, reciterId, syncSpeed, findCurrentSegment]);

  useEffect(() => {
    const cleanup = loadAudio();
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [loadAudio]);

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

  const pauseAudio = useCallback(() => {
    if (audioRef.current && state.isPlaying) {
      audioRef.current.pause();
    }
  }, [state.isPlaying]);

  const playAudio = useCallback(() => {
    if (!audioRef.current) return;
    
    if (!state.isPlaying) {
      audioRef.current.play().catch(err => {
        console.error('Playback failed:', err);
        setState(prev => ({ ...prev, error: 'Playback failed' }));
      });
    }
  }, [state.isPlaying]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (state.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Playback failed:', err);
        setState(prev => ({ ...prev, error: 'Playback failed' }));
      });
    }
  }, [state.isPlaying]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(prev => ({ ...prev, currentTime: time }));
    }
  }, []);

  const seekToVerse = useCallback((verseKey: string) => {
    if (!timingDataRef.current) return;

    const verseTiming = timingDataRef.current.verse_timings.find(
      t => t.verse_key === verseKey
    );

    if (verseTiming && audioRef.current) {
      const seekTime = verseTiming.timestamp_from / 1000;
      audioRef.current.currentTime = seekTime;
      
      const { verseKey: newVerseKey, wordIndex: newWordIndex } = findCurrentSegment(seekTime);
      setState(prev => ({
        ...prev,
        currentTime: seekTime,
        currentVerseKey: newVerseKey,
        currentWordIndex: newWordIndex,
      }));
    }
  }, [findCurrentSegment]);

  const setSpeed = useCallback((newSpeed: number) => {
    speedRef.current = newSpeed;
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
    setState(prev => ({ ...prev, speed: newSpeed }));
    setGlobalSpeed(newSpeed);
  }, []);

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
