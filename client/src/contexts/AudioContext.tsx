import { createContext, useContext, useState, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { useWordTimingAudio, type AudioFile } from '@/hooks/useWordTimingAudio';
import { getQuranComReciterId } from '@/lib/reciters';
import { chapters } from '@/lib/quranMetadata';

interface AudioContextValue {
  activeChapterId: number | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentVerseKey: string | null;
  currentWordIndex: number | null;
  isLoading: boolean;
  error: string | null;
  speed: number;
  loadChapter: (chapterId: number) => void;
  stopAudio: () => void;
  togglePlayPause: () => void;
  pauseAudio: () => void;
  playAudio: () => void;
  seek: (time: number) => void;
  seekToVerse: (verseKey: string) => void;
  setSpeed: (speed: number) => void;
  getTimingData: () => AudioFile | null;
  retry: () => void;
  registerVerseChangeCallback: (cb: ((verseKey: string) => void) | null) => void;
  registerEndedCallback: (cb: (() => void) | null) => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

interface AudioProviderProps {
  children: ReactNode;
  reciter: string;
  repeat: boolean;
  autoplay: boolean;
}

export function AudioProvider({ children, reciter, repeat, autoplay }: AudioProviderProps) {
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);

  const verseChangeCallbackRef = useRef<((verseKey: string) => void) | null>(null);
  const endedCallbackRef = useRef<(() => void) | null>(null);
  const activeChapterIdRef = useRef<number | null>(null);

  activeChapterIdRef.current = activeChapterId;

  const onVerseChange = useCallback((verseKey: string) => {
    verseChangeCallbackRef.current?.(verseKey);
  }, []);

  const onEnded = useCallback(() => {
    if (endedCallbackRef.current) {
      endedCallbackRef.current();
    } else {
      const currentId = activeChapterIdRef.current;
      if (currentId && currentId < 114) {
        setActiveChapterId(currentId + 1);
      }
    }
  }, []);

  const quranComReciterId = getQuranComReciterId(reciter);
  const enabled = activeChapterId !== null;

  const hookResult = useWordTimingAudio(
    activeChapterId ?? 1,
    quranComReciterId,
    repeat,
    onVerseChange,
    onEnded,
    1.0,
    autoplay,
    enabled
  );

  const loadChapter = useCallback((chapterId: number) => {
    const ch = chapters.find(c => c.id === chapterId);
    if (!ch) return;
    setActiveChapterId(chapterId);
  }, []);

  const stopAudio = useCallback(() => {
    hookResult.pauseAudio();
    setActiveChapterId(null);
  }, [hookResult.pauseAudio]);

  const registerVerseChangeCallback = useCallback((cb: ((verseKey: string) => void) | null) => {
    verseChangeCallbackRef.current = cb;
  }, []);

  const registerEndedCallback = useCallback((cb: (() => void) | null) => {
    endedCallbackRef.current = cb;
  }, []);

  const {
    isPlaying: hookIsPlaying, currentTime: hookCurrentTime, duration: hookDuration,
    currentVerseKey: hookCurrentVerseKey, currentWordIndex: hookCurrentWordIndex,
    isLoading: hookIsLoading, error: hookError, speed: hookSpeed,
    togglePlayPause, pauseAudio, playAudio, seek, seekToVerse,
    setSpeed, getTimingData, retry,
  } = hookResult;

  const value = useMemo<AudioContextValue>(() => ({
    activeChapterId,
    isPlaying:        enabled ? hookIsPlaying        : false,
    currentTime:      enabled ? hookCurrentTime      : 0,
    duration:         enabled ? hookDuration         : 0,
    currentVerseKey:  enabled ? hookCurrentVerseKey  : null,
    currentWordIndex: enabled ? hookCurrentWordIndex : null,
    isLoading:        enabled ? hookIsLoading        : false,
    error:            enabled ? hookError            : null,
    speed: hookSpeed,
    loadChapter,
    stopAudio,
    togglePlayPause,
    pauseAudio,
    playAudio,
    seek,
    seekToVerse,
    setSpeed,
    getTimingData,
    retry,
    registerVerseChangeCallback,
    registerEndedCallback,
  }), [
    activeChapterId, enabled,
    hookIsPlaying, hookCurrentTime, hookDuration,
    hookCurrentVerseKey, hookCurrentWordIndex,
    hookIsLoading, hookError, hookSpeed,
    togglePlayPause, pauseAudio, playAudio, seek, seekToVerse,
    setSpeed, getTimingData, retry,
    loadChapter, stopAudio,
    registerVerseChangeCallback, registerEndedCallback,
  ]);

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return ctx;
}
