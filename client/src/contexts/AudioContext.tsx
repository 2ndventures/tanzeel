import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { toast } from '@/hooks/use-toast';
import { useWordTimingAudio, type AudioFile } from '@/hooks/useWordTimingAudio';
import { getQuranComReciterId, getReciterById } from '@/lib/reciters';
import { chapters } from '@/lib/quranMetadata';
import { useMediaSession } from '@/hooks/useMediaSession';

interface AudioContextValue {
  activeChapterId: number | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentVerseKey: string | null;
  currentWordIndex: number | null;
  isLoading: boolean;
  error: string | null;
  timingError: boolean;
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
  goToNextChapter: () => void;
  goToPreviousChapter: () => void;
  registerVerseChangeCallback: (cb: ((verseKey: string) => void) | null) => void;
  registerChapterChangeCallback: (cb: ((chapterId: number) => void) | null) => void;
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
  const chapterChangeCallbackRef = useRef<((chapterId: number) => void) | null>(null);
  const activeChapterIdRef = useRef<number | null>(null);

  activeChapterIdRef.current = activeChapterId;

  const setActiveChapter = useCallback((chapterId: number) => {
    setActiveChapterId(chapterId);
    chapterChangeCallbackRef.current?.(chapterId);
  }, []);

  const onVerseChange = useCallback((verseKey: string) => {
    verseChangeCallbackRef.current?.(verseKey);
  }, []);

  const onEnded = useCallback(() => {
    const currentId = activeChapterIdRef.current;
    // Always advance the audio at the context level so background lock-screen and
    // mini-player playback continue even if no UI is mounted to handle navigation.
    // The chapter-change callback is what UIs register with to mirror the URL.
    if (currentId && currentId < 114) {
      setActiveChapter(currentId + 1);
    }
  }, [setActiveChapter]);

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
    setActiveChapter(chapterId);
  }, [setActiveChapter]);

  const stopAudio = useCallback(() => {
    hookResult.pauseAudio();
    setActiveChapterId(null);
  }, [hookResult.pauseAudio]);

  const goToNextChapter = useCallback(() => {
    const currentId = activeChapterIdRef.current;
    if (currentId && currentId < 114) {
      setActiveChapter(currentId + 1);
    }
  }, [setActiveChapter]);

  const goToPreviousChapter = useCallback(() => {
    const currentId = activeChapterIdRef.current;
    if (!currentId) return;
    // Platform convention: "previous" within the first 3 seconds jumps to the
    // previous surah; after that it restarts the current surah from the start.
    // Use the live audio element time via getCurrentTime() rather than React
    // state (hookCurrentTime), which is driven by the rAF loop. iOS pauses rAF
    // when the screen locks, so React state freezes at the lock-time position
    // while the audio continues playing — making hookCurrentTime stale.
    if (hookResult.getCurrentTime() > 3) {
      hookResult.seek(0);
      return;
    }
    if (currentId > 1) {
      setActiveChapter(currentId - 1);
    } else {
      // Chapter 1: restart from the beginning.
      hookResult.seek(0);
    }
  }, [setActiveChapter, hookResult.getCurrentTime, hookResult.seek]);

  const registerVerseChangeCallback = useCallback((cb: ((verseKey: string) => void) | null) => {
    verseChangeCallbackRef.current = cb;
  }, []);

  const registerChapterChangeCallback = useCallback((cb: ((chapterId: number) => void) | null) => {
    chapterChangeCallbackRef.current = cb;
  }, []);

  const {
    isPlaying: hookIsPlaying, currentTime: hookCurrentTime, duration: hookDuration,
    currentVerseKey: hookCurrentVerseKey, currentWordIndex: hookCurrentWordIndex,
    isLoading: hookIsLoading, error: hookError, speed: hookSpeed,
    isStalled: hookIsStalled, timingError: hookTimingError,
    togglePlayPause, pauseAudio, playAudio, seek, seekToVerse,
    setSpeed, getTimingData, retry,
  } = hookResult;

  // Show a toast whenever a new playback error surfaces while a chapter is
  // active. The ref guards against re-toasting the same error on re-renders.
  const prevErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !hookError) {
      prevErrorRef.current = null;
      return;
    }
    if (hookError !== prevErrorRef.current) {
      toast({
        title: 'Playback error',
        description: hookError,
        variant: 'destructive',
      });
    }
    prevErrorRef.current = hookError;
  }, [enabled, hookError]);

  const value = useMemo<AudioContextValue>(() => ({
    activeChapterId,
    isPlaying:        enabled ? hookIsPlaying        : false,
    currentTime:      enabled ? hookCurrentTime      : 0,
    duration:         enabled ? hookDuration         : 0,
    currentVerseKey:  enabled ? hookCurrentVerseKey  : null,
    currentWordIndex: enabled ? hookCurrentWordIndex : null,
    isLoading:        enabled ? hookIsLoading        : false,
    error:            enabled ? hookError            : null,
    timingError:      enabled ? hookTimingError      : false,
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
    goToNextChapter,
    goToPreviousChapter,
    registerVerseChangeCallback,
    registerChapterChangeCallback,
  }), [
    activeChapterId, enabled,
    hookIsPlaying, hookCurrentTime, hookDuration,
    hookCurrentVerseKey, hookCurrentWordIndex,
    hookIsLoading, hookError, hookTimingError, hookSpeed,
    togglePlayPause, pauseAudio, playAudio, seek, seekToVerse,
    setSpeed, getTimingData, retry,
    loadChapter, stopAudio,
    goToNextChapter, goToPreviousChapter,
    registerVerseChangeCallback,
    registerChapterChangeCallback,
  ]);

  // ── Global Media Session (lock-screen + Bluetooth controls) ──────────────────
  // Lifted out of ChapterView so playback metadata + transport controls remain
  // active on every page (Home, Bookmarks, Settings) for as long as audio is loaded.
  const activeChapterInfo = activeChapterId ? chapters.find(c => c.id === activeChapterId) : null;
  const reciterDisplayName = getReciterById(reciter)?.name || 'Mishary Rashid Alafasy';
  const canGoNext = !!activeChapterId && activeChapterId < 114;
  // Chapter 1 is still reachable (restarts from the beginning), so the
  // previous button should be visible whenever a chapter is active.
  const canGoPrev = !!activeChapterId;
  useMediaSession({
    title: activeChapterInfo?.englishName || 'Quran',
    artist: reciterDisplayName,
    album: 'Tanzeel',
    isPlaying: value.isPlaying,
    currentTime: value.currentTime,
    duration: value.duration,
    speed: value.speed,
    isStalled: enabled ? hookIsStalled : false,
    onPlay: playAudio,
    onPause: pauseAudio,
    onSeek: seek,
    onNextTrack: canGoNext ? goToNextChapter : null,
    onPreviousTrack: canGoPrev ? goToPreviousChapter : null,
    active: enabled,
  });

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
