import { createContext, useContext, useState, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { useWordTimingAudio, type AudioFile } from '@/hooks/useWordTimingAudio';
import { getQuranComReciterId } from '@/lib/reciters';
import { chapters } from '@/lib/quranMetadata';

interface AudioActions {
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

interface AudioStatus {
  activeChapterId: number | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  speed: number;
  duration: number;
}

interface AudioProgress {
  currentTime: number;
  currentVerseKey: string | null;
  currentWordIndex: number | null;
}

interface AudioContextValue extends AudioActions, AudioStatus, AudioProgress {}

const AudioActionsContext = createContext<AudioActions | null>(null);
const AudioStatusContext = createContext<AudioStatus | null>(null);
const AudioProgressContext = createContext<AudioProgress | null>(null);

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

  const actions: AudioActions = useMemo(() => ({
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
  }), [loadChapter, stopAudio, hookResult.togglePlayPause, hookResult.pauseAudio, hookResult.playAudio, hookResult.seek, hookResult.seekToVerse, hookResult.setSpeed, hookResult.getTimingData, hookResult.retry, registerVerseChangeCallback, registerEndedCallback]);

  const status: AudioStatus = useMemo(() => ({
    activeChapterId,
    isPlaying: enabled ? hookResult.isPlaying : false,
    isLoading: enabled ? hookResult.isLoading : false,
    error: enabled ? hookResult.error : null,
    speed: hookResult.speed,
    duration: enabled ? hookResult.duration : 0,
  }), [activeChapterId, enabled, hookResult.isPlaying, hookResult.isLoading, hookResult.error, hookResult.speed, hookResult.duration]);

  const progress: AudioProgress = useMemo(() => ({
    currentTime: enabled ? hookResult.currentTime : 0,
    currentVerseKey: enabled ? hookResult.currentVerseKey : null,
    currentWordIndex: enabled ? hookResult.currentWordIndex : null,
  }), [enabled, hookResult.currentTime, hookResult.currentVerseKey, hookResult.currentWordIndex]);

  return (
    <AudioActionsContext.Provider value={actions}>
      <AudioStatusContext.Provider value={status}>
        <AudioProgressContext.Provider value={progress}>
          {children}
        </AudioProgressContext.Provider>
      </AudioStatusContext.Provider>
    </AudioActionsContext.Provider>
  );
}

export function useAudioActions(): AudioActions {
  const ctx = useContext(AudioActionsContext);
  if (!ctx) throw new Error('useAudioActions must be used within an AudioProvider');
  return ctx;
}

export function useAudioStatus(): AudioStatus {
  const ctx = useContext(AudioStatusContext);
  if (!ctx) throw new Error('useAudioStatus must be used within an AudioProvider');
  return ctx;
}

export function useAudioProgress(): AudioProgress {
  const ctx = useContext(AudioProgressContext);
  if (!ctx) throw new Error('useAudioProgress must be used within an AudioProvider');
  return ctx;
}

export function useAudio(): AudioContextValue {
  const actions = useAudioActions();
  const status = useAudioStatus();
  const progress = useAudioProgress();
  return { ...actions, ...status, ...progress };
}
