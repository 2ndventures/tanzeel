import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react';
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

  const onVerseChange = useCallback((verseKey: string) => {
    verseChangeCallbackRef.current?.(verseKey);
  }, []);

  const onEnded = useCallback(() => {
    endedCallbackRef.current?.();
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

  const value: AudioContextValue = {
    activeChapterId,
    isPlaying: enabled ? hookResult.isPlaying : false,
    currentTime: enabled ? hookResult.currentTime : 0,
    duration: enabled ? hookResult.duration : 0,
    currentVerseKey: enabled ? hookResult.currentVerseKey : null,
    currentWordIndex: enabled ? hookResult.currentWordIndex : null,
    isLoading: enabled ? hookResult.isLoading : false,
    error: enabled ? hookResult.error : null,
    speed: hookResult.speed,
    loadChapter,
    stopAudio,
    togglePlayPause: hookResult.togglePlayPause,
    pauseAudio: hookResult.pauseAudio,
    playAudio: hookResult.playAudio,
    seek: hookResult.seek,
    seekToVerse: hookResult.seekToVerse,
    setSpeed: hookResult.setSpeed,
    getTimingData: hookResult.getTimingData,
    retry: hookResult.retry,
    registerVerseChangeCallback,
    registerEndedCallback,
  };

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
