import { createContext, useContext, useState, useRef, useCallback, useMemo, type ReactNode } from 'react';
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
    if (hookResult.currentTime > 3) {
      hookResult.seek(0);
      return;
    }
    if (currentId > 1) {
      setActiveChapter(currentId - 1);
    } else {
      hookResult.seek(0);
    }
  }, [setActiveChapter, hookResult.currentTime, hookResult.seek]);

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
    goToNextChapter,
    goToPreviousChapter,
    registerVerseChangeCallback,
    registerChapterChangeCallback,
  }), [
    activeChapterId, enabled,
    hookIsPlaying, hookCurrentTime, hookDuration,
    hookCurrentVerseKey, hookCurrentWordIndex,
    hookIsLoading, hookError, hookSpeed,
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
  const canGoPrev = !!activeChapterId && activeChapterId > 1;
  useMediaSession({
    title: activeChapterInfo?.englishName || 'Quran',
    artist: reciterDisplayName,
    album: 'Tanzeel',
    isPlaying: value.isPlaying,
    currentTime: value.currentTime,
    duration: value.duration,
    speed: value.speed,
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
