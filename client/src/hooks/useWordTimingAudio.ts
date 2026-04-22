import { useState, useEffect, useRef, useCallback } from 'react';
import { getTimingDataFromMemory, storeTimingDataInMemory } from '@/lib/audioCache';
import { getItem, setItem, removeItem } from '@/lib/storage';
import {
  getCachedAudioUri,
  getDownloadedVerseNumbers,
  getOfflineTimingData,
  isFullChapterDownloaded,
  getFullChapterAudioUri,
} from '@/services/audioCache';
import { RECITER_TO_QURAN_COM_ID } from '@/lib/reciters';
import { getTimingUrl, getChapterAudioUrl, normalizeTimingResponse } from '@/lib/audioUrls';

const GLOBAL_SPEED_KEY = 'quran-playback-speed';
const OLD_CHAPTER_SPEEDS_KEY = 'quran-chapter-speeds';

async function migrateOldSpeedData(): Promise<void> {
  try {
    const oldData = await getItem(OLD_CHAPTER_SPEEDS_KEY);
    if (oldData) {
      await removeItem(OLD_CHAPTER_SPEEDS_KEY);
    }
  } catch (error) {
    console.error('Failed to migrate old speed data:', error);
  }
}

async function getGlobalSpeed(): Promise<number | null> {
  try {
    await migrateOldSpeedData();
    
    const saved = await getItem(GLOBAL_SPEED_KEY);
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

async function setGlobalSpeed(speed: number): Promise<void> {
  try {
    await setItem(GLOBAL_SPEED_KEY, speed.toString());
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

function quranComIdToReciterString(quranComId: number): string | null {
  for (const [strId, numId] of Object.entries(RECITER_TO_QURAN_COM_ID)) {
    if (numId === quranComId) return strId;
  }
  return null;
}

export function useWordTimingAudio(
  chapterId: number,
  reciterId: number = 7,
  repeat: boolean = false,
  onVerseChange?: (verseKey: string) => void,
  onEnded?: () => void,
  initialSpeed: number = 1.0,
  autoplay: boolean = false,
  enabled: boolean = true
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  
  const repeatRef = useRef(repeat);
  const onVerseChangeRef = useRef(onVerseChange);
  const onEndedRef = useRef(onEnded);
  const speedRef = useRef(initialSpeed);
  const autoplayRef = useRef(autoplay);
  const timingDataRef = useRef<AudioFile | null>(null);

  const verseByVerseRef = useRef(false);
  const vbvAvailableVersesRef = useRef<number[]>([]);
  const vbvTimingsRef = useRef<WordSegment[]>([]);
  const vbvPreloadRef = useRef<Map<number, HTMLAudioElement>>(new Map());

  const [state, setState] = useState<WordTimingAudioState>({
    isPlaying: false,
    speed: initialSpeed,
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

  const syncSpeed = useCallback(async () => {
    const savedSpeed = await getGlobalSpeed();
    const newSpeed = savedSpeed ?? initialSpeed;
    
    speedRef.current = newSpeed;
    setState(prev => ({ ...prev, speed: newSpeed }));
    
    return newSpeed;
  }, [initialSpeed]);

  // Binary search within a verse's word segments
  const findWordInVerse = useCallback((
    t: WordSegment,
    currentTimeMs: number
  ): { verseKey: string; wordIndex: number | null } => {
    const segs = t.segments;
    if (segs.length === 0) return { verseKey: t.verse_key, wordIndex: null };
    let lo = 0, hi = segs.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const s = segs[mid];
      if (currentTimeMs < s[1]) hi = mid - 1;
      else if (currentTimeMs > s[2]) lo = mid + 1;
      else return { verseKey: t.verse_key, wordIndex: s[0] - 1 };
    }
    if (lo > 0) return { verseKey: t.verse_key, wordIndex: segs[lo - 1][0] - 1 };
    return { verseKey: t.verse_key, wordIndex: null };
  }, []);

  const findCurrentSegment = useCallback((currentTime: number) => {
    if (!timingDataRef.current) return { verseKey: null, wordIndex: null };
    const timings = timingDataRef.current.verse_timings;
    const currentTimeMs = currentTime * 1000;

    // Fast path: check cached verse index first (O(1) for the common sequential case)
    const ci = currentVerseIndexRef.current;
    if (ci >= 0 && ci < timings.length) {
      const t = timings[ci];
      if (currentTimeMs >= t.timestamp_from && currentTimeMs < t.timestamp_to) {
        return findWordInVerse(t, currentTimeMs);
      }
      // Check the next verse (normal forward playback)
      if (ci + 1 < timings.length) {
        const next = timings[ci + 1];
        if (currentTimeMs >= next.timestamp_from && currentTimeMs < next.timestamp_to) {
          currentVerseIndexRef.current = ci + 1;
          return findWordInVerse(next, currentTimeMs);
        }
      }
    }

    // Slow path: binary search over verse_timings (O(log n))
    let lo = 0, hi = timings.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const t = timings[mid];
      if (currentTimeMs < t.timestamp_from) hi = mid - 1;
      else if (currentTimeMs >= t.timestamp_to) lo = mid + 1;
      else {
        currentVerseIndexRef.current = mid;
        return findWordInVerse(t, currentTimeMs);
      }
    }

    // Between verses — hold the last word of the verse that just ended rather than
    // blanking the highlight. After the binary search, lo is the index of the first
    // verse whose timestamp_from exceeds currentTimeMs, so lo-1 is the one that ended.
    const prevIdx = lo - 1;
    if (prevIdx >= 0 && prevIdx < timings.length) {
      currentVerseIndexRef.current = prevIdx;
      const prev = timings[prevIdx];
      return findWordInVerse(prev, prev.timestamp_to - 1);
    }
    currentVerseIndexRef.current = -1;
    return { verseKey: null, wordIndex: null };
  }, [findWordInVerse]);

  const findVbvWordIndex = useCallback((currentTime: number, verseTiming: WordSegment): number | null => {
    if (!verseTiming.segments || verseTiming.segments.length === 0) return null;
    const offsetMs = verseTiming.timestamp_from;
    const currentTimeMs = currentTime * 1000;
    for (let i = 0; i < verseTiming.segments.length; i++) {
      const seg = verseTiming.segments[i];
      const wordStart = seg[1] - offsetMs;
      const wordEnd = seg[2] - offsetMs;
      if (currentTimeMs >= wordStart && currentTimeMs <= wordEnd) {
        return seg[0] - 1;
      }
    }
    const last = verseTiming.segments[verseTiming.segments.length - 1];
    if (currentTimeMs >= (last[1] - offsetMs)) {
      return last[0] - 1;
    }
    return null;
  }, []);

  const retryCountRef = useRef(0);
  const MAX_AUTO_RETRIES = 2;
  const cleanupRef = useRef<(() => void) | null>(null);
  const loadIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vbvSkipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const currentVerseIndexRef = useRef<number>(-1);
  const srcChangingRef = useRef(false);

  // The chapter currently bound to the live audio element. handleEnded reads this
  // (instead of the loadAudio closure's chapterId) so that after an in-place
  // chapter advance, the next `ended` event computes "next" relative to the
  // chapter actually playing, not the chapter that was loading when the
  // listeners were attached.
  const currentChapterIdRef = useRef<number | null>(null);

  // Set by the previous chapter's `ended` handler when it has swapped the
  // audio element's src to the next chapter's URL in-place and started
  // playback. The next loadAudio invocation honors this token and skips
  // teardown / element recreation, so iOS WKWebView keeps the lock-screen
  // Now Playing card alive and background playback continues uninterrupted.
  // Token is keyed by both chapterId AND reciterId so a reciter switch mid-
  // transition does NOT silently keep playing the old reciter's audio.
  const inPlaceAdvanceRef = useRef<{ chapterId: number; reciterId: number } | null>(null);
  const inPlaceWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearInPlaceAdvance = useCallback(() => {
    inPlaceAdvanceRef.current = null;
    if (inPlaceWatchdogRef.current) {
      clearTimeout(inPlaceWatchdogRef.current);
      inPlaceWatchdogRef.current = null;
    }
  }, []);

  const preloadNextVerses = useCallback(async (
    currentVerseNum: number,
    reciterString: string
  ) => {
    const available = vbvAvailableVersesRef.current;
    const idx = available.indexOf(currentVerseNum);
    if (idx < 0) return;

    const wantSet = new Set<number>();
    for (let i = 1; i <= 2; i++) {
      if (idx + i < available.length) {
        wantSet.add(available[idx + i]);
      }
    }

    const map = vbvPreloadRef.current;
    for (const [v, audio] of map) {
      if (!wantSet.has(v)) {
        audio.pause();
        audio.src = '';
        audio.remove();
        map.delete(v);
      }
    }

    if (wantSet.size === 0) return;

    for (const verseNum of wantSet) {
      if (map.has(verseNum)) continue;

      const uri = await getCachedAudioUri(reciterString, chapterId, verseNum);
      if (!uri) continue;
      if (map.has(verseNum)) continue;

      const preloadAudio = document.createElement('audio');
      preloadAudio.preload = 'auto';
      preloadAudio.src = uri;
      preloadAudio.load();
      map.set(verseNum, preloadAudio);
    }
  }, [chapterId]);

  const attachVerseListeners = useCallback((
    audio: HTMLAudioElement,
    verseNum: number,
    reciterString: string,
    shouldPlay: boolean
  ) => {
    const available = vbvAvailableVersesRef.current;
    const verseKey = `${chapterId}:${verseNum}`;
    const verseTiming = vbvTimingsRef.current.find(t => t.verse_key === verseKey);

    const handleLoadedMetadata = () => {
      const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      setState(prev => ({
        ...prev,
        duration: dur,
        currentTime: 0,
      }));
    };

    const handleTimeUpdate = () => {
      const ct = audio.currentTime;
      let wordIndex: number | null = null;
      if (verseTiming) {
        wordIndex = findVbvWordIndex(ct, verseTiming);
      }
      const actuallyPlaying = !audio.paused && !audio.ended;
      setState(prev => {
        const sameWord = prev.currentWordIndex === wordIndex;
        const needsLoadingClear = actuallyPlaying && prev.isLoading;
        const needsPlayingSet = actuallyPlaying && !prev.isPlaying;
        if (sameWord && !needsLoadingClear && !needsPlayingSet) return prev;
        return {
          ...prev,
          currentWordIndex: wordIndex,
          ...(needsLoadingClear && { isLoading: false }),
          ...(needsPlayingSet && { isPlaying: true }),
        };
      });
    };

    let hasAutoStarted = false;
    const handleCanPlay = () => {
      audio.playbackRate = speedRef.current;
      if (!hasAutoStarted) {
        hasAutoStarted = true;
        setState(prev => ({ ...prev, isLoading: false }));
        if (shouldPlay) {
          audio.play().catch(() => {
            setState(prev => ({ ...prev, isPlaying: false, error: 'Tap play to start audio' }));
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    const handlePlay = () => {
      if (audioRef.current !== audio) return;
      setState(prev => ({ ...prev, isPlaying: true, error: null }));
      preloadNextVerses(verseNum, reciterString);
    };

    const handlePause = () => {
      if (audioRef.current !== audio) return;
      if (srcChangingRef.current) return;
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleEnded = () => {
      if (audioRef.current !== audio) return;
      if (repeatRef.current) {
        audio.currentTime = 0;
        audio.play();
        return;
      }
      const idx = available.indexOf(verseNum);
      if (idx < available.length - 1) {
        const nextVerse = available[idx + 1];
        loadVerseByVerseAudio(nextVerse, true, reciterString);
      } else {
        setState(prev => ({ ...prev, isPlaying: false }));
        onEndedRef.current?.();
      }
    };

    const handleError = () => {
      if (audioRef.current !== audio) return;
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
        error: `Failed to play verse ${verseNum} offline`,
      }));
    };

    // `playing` fires when actual playback resumes after a pause or buffer recovery —
    // more authoritative than `play` for sync. `waiting`/`stalled` fire when the
    // browser pauses internally while it buffers. Tracking them prevents the mini
    // player + lock-screen icon from flickering between play/pause states.
    const handlePlaying = () => {
      if (audioRef.current !== audio) return;
      setState(prev => ({ ...prev, isPlaying: true, isLoading: false, error: null }));
    };
    const handleWaiting = () => {
      if (audioRef.current !== audio) return;
      setState(prev => prev.isLoading ? prev : { ...prev, isLoading: true });
    };
    const handleStalled = handleWaiting;

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    cleanupRef.current = () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
      audio.remove();
      audioRef.current = null;
    };
  }, [chapterId, findVbvWordIndex, preloadNextVerses]);

  const loadVerseByVerseAudio = useCallback(async (
    verseNum: number,
    shouldPlay: boolean,
    reciterString: string
  ) => {
    const available = vbvAvailableVersesRef.current;
    if (!available.includes(verseNum)) {
      const nextAvailable = available.find(v => v > verseNum);
      if (nextAvailable) {
        setState(prev => ({
          ...prev,
          error: `Verse ${verseNum} not available offline, skipping...`,
        }));
        if (vbvSkipTimerRef.current) clearTimeout(vbvSkipTimerRef.current);
        const currentLoadId = loadIdRef.current;
        vbvSkipTimerRef.current = setTimeout(() => {
          if (loadIdRef.current === currentLoadId) {
            loadVerseByVerseAudio(nextAvailable, shouldPlay, reciterString);
          }
        }, 1500);
        return;
      }
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        error: 'No more downloaded verses available',
      }));
      onEndedRef.current?.();
      return;
    }

    const verseKey = `${chapterId}:${verseNum}`;
    setState(prev => ({
      ...prev,
      currentVerseKey: verseKey,
      currentWordIndex: null,
      error: null,
    }));
    onVerseChangeRef.current?.(verseKey);

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (!audioContainerRef.current) {
      const container = document.createElement('div');
      container.style.display = 'none';
      container.id = `quran-audio-player-${chapterId}`;
      document.body.appendChild(container);
      audioContainerRef.current = container;
    }

    const preloadedAudio = vbvPreloadRef.current.get(verseNum);
    if (preloadedAudio) {
      vbvPreloadRef.current.delete(verseNum);
      const audio = preloadedAudio;
      audioContainerRef.current.appendChild(audio);
      audioRef.current = audio;
      attachVerseListeners(audio, verseNum, reciterString, shouldPlay);

      if (audio.readyState >= 3) {
        audio.playbackRate = speedRef.current;
        setState(prev => ({ ...prev, isLoading: false, duration: isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0, currentTime: 0 }));
        if (shouldPlay) {
          audio.play().catch(() => {
            setState(prev => ({ ...prev, isPlaying: false, error: 'Tap play to start audio' }));
          });
        }
        preloadNextVerses(verseNum, reciterString);
      } else {
        setState(prev => ({ ...prev, isLoading: true }));
      }
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    const preLoadId = loadIdRef.current;
    const uri = await getCachedAudioUri(reciterString, chapterId, verseNum);
    if (loadIdRef.current !== preLoadId) return;
    if (!uri) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: `Verse ${verseNum} file missing from storage`,
      }));
      return;
    }

    const audio = document.createElement('audio');
    audio.preload = 'auto';
    audioContainerRef.current.appendChild(audio);
    audioRef.current = audio;
    attachVerseListeners(audio, verseNum, reciterString, shouldPlay);
    audio.src = uri;
    audio.playbackRate = speedRef.current;
    audio.load();
  }, [chapterId, attachVerseListeners, preloadNextVerses]);

  const tryVerseByVerseFallback = useCallback(async (): Promise<boolean> => {
    if (verseByVerseRef.current) return false;

    const reciterString = quranComIdToReciterString(reciterId);
    if (!reciterString) return false;

    const downloadedVerses = getDownloadedVerseNumbers(reciterString, chapterId);
    if (downloadedVerses.length === 0) return false;

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const preLoadId = loadIdRef.current;
    const offlineTiming = await getOfflineTimingData(reciterString, chapterId) as TimingData | null;
    if (loadIdRef.current !== preLoadId) return false;
    if (offlineTiming?.audio_files?.[0]?.verse_timings) {
      vbvTimingsRef.current = offlineTiming.audio_files[0].verse_timings;
      timingDataRef.current = offlineTiming.audio_files[0];
    } else {
      vbvTimingsRef.current = [];
    }

    verseByVerseRef.current = true;
    vbvAvailableVersesRef.current = downloadedVerses;

    const firstVerse = downloadedVerses[0];
    await loadVerseByVerseAudio(firstVerse, autoplayRef.current, reciterString);
    if (loadIdRef.current !== preLoadId) return false;
    return true;
  }, [reciterId, chapterId, loadVerseByVerseAudio]);

  const loadAudio = useCallback(async () => {
    // ── In-place chapter advance fast path ──────────────────────────────────
    // The previous chapter's `ended` handler already swapped the live audio
    // element's src to this chapter's URL and called .play(), so iOS treats
    // playback as a continuation and the lock-screen Now Playing card stays
    // bound. Skip teardown + element recreation; just refresh timing data.
    // Token must match BOTH chapterId and reciterId — otherwise (user switched
    // reciter or jumped to a non-adjacent chapter mid-transition), discard
    // the token and fall through to the normal teardown/recreate path so we
    // don't keep playing the wrong audio under the wrong UI.
    const inPlaceToken = inPlaceAdvanceRef.current;
    if (
      inPlaceToken !== null &&
      inPlaceToken.chapterId === chapterId &&
      inPlaceToken.reciterId === reciterId &&
      audioRef.current
    ) {
      clearInPlaceAdvance();
      currentChapterIdRef.current = chapterId;
      timingDataRef.current = null;
      currentVerseIndexRef.current = -1;
      verseByVerseRef.current = false;
      setState(prev => ({
        ...prev,
        currentVerseKey: null,
        currentWordIndex: null,
        error: null,
      }));

      const myLoadIdInPlace = loadIdRef.current;
      const reciterStringInPlace = quranComIdToReciterString(reciterId);
      const timingUrl = getTimingUrl(reciterId, chapterId);
      try {
        const memCached = getTimingDataFromMemory(reciterId, chapterId);
        const timingData: TimingData = memCached ?? await (async () => {
          const r = await fetch(timingUrl);
          if (!r.ok) throw new Error(`Timing API ${r.status}`);
          const raw = await r.json() as Record<string, unknown>;
          const normalized = normalizeTimingResponse(raw);
          const data: TimingData = { audio_files: normalized.audio_files as AudioFile[] };
          storeTimingDataInMemory(reciterId, chapterId, data);
          return data;
        })();
        if (loadIdRef.current !== myLoadIdInPlace) return;
        if (timingData.audio_files?.[0]) {
          timingDataRef.current = timingData.audio_files[0];
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        // Audio is already playing the new chapter — timing-data refresh
        // failure only affects word highlighting, not playback. Log and
        // continue.
        console.error('Tanzeel: timing refresh during in-place advance failed:', err);
      }
      // Suppress unused-variable warning for reciterStringInPlace; kept for
      // future per-reciter timing endpoints.
      void reciterStringInPlace;
      return;
    }

    // Token didn't match the fast path — discard it so it can't poison a
    // later cleanup. We're about to do a full teardown + recreate anyway.
    clearInPlaceAdvance();

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    srcChangingRef.current = false;
    const myLoadId = loadIdRef.current;
    try {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      for (const [, audio] of vbvPreloadRef.current) {
        audio.pause();
        audio.src = '';
        audio.remove();
      }
      vbvPreloadRef.current.clear();

      if (audioContainerRef.current) {
        audioContainerRef.current.remove();
        audioContainerRef.current = null;
      }

      verseByVerseRef.current = false;
      currentVerseIndexRef.current = -1;

      setState(prev => ({ ...prev, isPlaying: false, isLoading: true, error: null, currentVerseKey: null, currentWordIndex: null, currentTime: 0, duration: 0 }));

      syncSpeed();

      const reciterString = quranComIdToReciterString(reciterId);
      if (reciterString) {
        if (isFullChapterDownloaded(reciterString, chapterId)) {
          const offlineTiming = await getOfflineTimingData(reciterString, chapterId) as TimingData | null;
          if (loadIdRef.current !== myLoadId) return;
          const offlineUri = await getFullChapterAudioUri(reciterString, chapterId);
          if (loadIdRef.current !== myLoadId) return;

          if (offlineUri && offlineTiming?.audio_files?.[0]) {
            timingDataRef.current = offlineTiming.audio_files[0];
            currentChapterIdRef.current = chapterId;

            const container = document.createElement('div');
            container.style.display = 'none';
            container.id = `quran-audio-player-${chapterId}`;
            document.body.appendChild(container);
            audioContainerRef.current = container;

            const audio = document.createElement('audio');
            audio.preload = 'auto';
            container.appendChild(audio);
            audio.src = offlineUri;
            audio.load();

            const handleLoadedMetadata = () => {
              if (loadIdRef.current !== myLoadId) return;
              const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
              setState(prev => ({ ...prev, duration: dur, currentTime: 0 }));
            };

            const handleTimeUpdate = () => {
              if (loadIdRef.current !== myLoadId) return;
              const currentTime = audio.currentTime;
              const { verseKey, wordIndex } = findCurrentSegment(currentTime);
              const actuallyPlaying = !audio.paused && !audio.ended;
              setState(prev => {
                const sameSegment = prev.currentVerseKey === verseKey && prev.currentWordIndex === wordIndex;
                const needsLoadingClear = actuallyPlaying && prev.isLoading;
                const needsPlayingSet = actuallyPlaying && !prev.isPlaying;
                if (sameSegment && !needsLoadingClear && !needsPlayingSet) return prev;
                if (verseKey && verseKey !== prev.currentVerseKey) {
                  onVerseChangeRef.current?.(verseKey);
                }
                return {
                  ...prev,
                  currentVerseKey: verseKey,
                  currentWordIndex: wordIndex,
                  ...(needsLoadingClear && { isLoading: false }),
                  ...(needsPlayingSet && { isPlaying: true }),
                };
              });
            };

            let hasAutoStarted = false;
            const handleCanPlay = () => {
              if (loadIdRef.current !== myLoadId) return;
              retryCountRef.current = 0;
              audio.playbackRate = speedRef.current;
              if (!hasAutoStarted) {
                hasAutoStarted = true;
                if (autoplayRef.current) {
                  setState(prev => ({ ...prev, isLoading: false }));
                  audio.play().catch(() => {
                    setState(prev => ({ ...prev, isPlaying: false, isLoading: false, error: 'Tap play to start audio' }));
                  });
                } else {
                  setState(prev => ({ ...prev, isLoading: false, isPlaying: false }));
                }
              }
            };

            const handlePlay = () => {
              if (loadIdRef.current !== myLoadId) return;
              setState(prev => ({ ...prev, isPlaying: true, error: null }));
            };

            const handlePause = () => {
              if (loadIdRef.current !== myLoadId) return;
              if (srcChangingRef.current) return;
              setState(prev => ({ ...prev, isPlaying: false }));
            };

            const handleEnded = () => {
              if (loadIdRef.current !== myLoadId) return;
              if (repeatRef.current) {
                audio.currentTime = 0;
                audio.play();
              } else {
                setState(prev => ({ ...prev, isPlaying: false }));
                onEndedRef.current?.();
              }
            };

            const handleError = () => {
              if (loadIdRef.current !== myLoadId) return;
              setState(prev => ({ ...prev, isLoading: false, isPlaying: false, error: 'Offline audio failed to load. Tap retry.' }));
            };

            // See note in VBV block: tracking `playing`/`waiting`/`stalled` keeps the
            // mini-player + lock-screen icon in sync during buffer recovery and
            // browser-initiated pause/resume cycles.
            const handlePlaying = () => {
              if (loadIdRef.current !== myLoadId) return;
              setState(prev => ({ ...prev, isPlaying: true, isLoading: false, error: null }));
            };
            const handleWaiting = () => {
              if (loadIdRef.current !== myLoadId) return;
              setState(prev => prev.isLoading ? prev : { ...prev, isLoading: true });
            };
            const handleStalled = handleWaiting;

            audio.addEventListener('loadedmetadata', handleLoadedMetadata);
            audio.addEventListener('timeupdate', handleTimeUpdate);
            audio.addEventListener('canplay', handleCanPlay);
            audio.addEventListener('play', handlePlay);
            audio.addEventListener('playing', handlePlaying);
            audio.addEventListener('pause', handlePause);
            audio.addEventListener('waiting', handleWaiting);
            audio.addEventListener('stalled', handleStalled);
            audio.addEventListener('ended', handleEnded);
            audio.addEventListener('error', handleError);

            audio.playbackRate = speedRef.current;
            audioRef.current = audio;

            if (audio.readyState >= 2) handleLoadedMetadata();
            if (audio.readyState >= 3) handleCanPlay();

            cleanupRef.current = () => {
              audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
              audio.removeEventListener('timeupdate', handleTimeUpdate);
              audio.removeEventListener('canplay', handleCanPlay);
              audio.removeEventListener('play', handlePlay);
              audio.removeEventListener('playing', handlePlaying);
              audio.removeEventListener('pause', handlePause);
              audio.removeEventListener('waiting', handleWaiting);
              audio.removeEventListener('stalled', handleStalled);
              audio.removeEventListener('ended', handleEnded);
              audio.removeEventListener('error', handleError);
              audio.pause();
              audio.src = '';
              audio.remove();
              audioRef.current = null;
            };
            return;
          }
        }

      }

      const container = document.createElement('div');
      container.style.display = 'none';
      container.id = `quran-audio-player-${chapterId}`;
      document.body.appendChild(container);
      audioContainerRef.current = container;

      const audio = document.createElement('audio');
      audio.preload = 'auto';
      container.appendChild(audio);
      currentChapterIdRef.current = chapterId;

      // Start audio buffering immediately — timing fetches in parallel below
      const predictableUrl = getChapterAudioUrl(reciterId, chapterId);
      if (predictableUrl) {
        audio.src = predictableUrl;
        audio.load();
      }

      // ── Register all handlers NOW (before timing arrives) ──────────────────
      // handleTimeUpdate guards on timingDataRef.current so it's a no-op until
      // timing data lands; everything else (canplay, play, pause…) works fine
      // without timing data.

      const handleLoadedMetadata = () => {
        if (loadIdRef.current !== myLoadId) return;
        const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        setState(prev => ({ ...prev, duration: dur, currentTime: 0 }));
      };

      const handleTimeUpdate = () => {
        if (loadIdRef.current !== myLoadId) return;
        const actuallyPlaying = !audio.paused && !audio.ended;
        if (!timingDataRef.current) {
          // Timing data not yet loaded — still reconcile play/loading state against real audio.
          if (actuallyPlaying) {
            setState(prev => {
              const needsLoadingClear = prev.isLoading;
              const needsPlayingSet = !prev.isPlaying;
              if (!needsLoadingClear && !needsPlayingSet) return prev;
              return {
                ...prev,
                ...(needsLoadingClear && { isLoading: false }),
                ...(needsPlayingSet && { isPlaying: true }),
              };
            });
          }
          return;
        }
        const ct = audio.currentTime;
        const { verseKey, wordIndex } = findCurrentSegment(ct);
        setState(prev => {
          const sameSegment = prev.currentVerseKey === verseKey && prev.currentWordIndex === wordIndex;
          const needsLoadingClear = actuallyPlaying && prev.isLoading;
          const needsPlayingSet = actuallyPlaying && !prev.isPlaying;
          if (sameSegment && !needsLoadingClear && !needsPlayingSet) return prev;
          if (verseKey && verseKey !== prev.currentVerseKey) {
            onVerseChangeRef.current?.(verseKey);
          }
          return {
            ...prev,
            currentVerseKey: verseKey,
            currentWordIndex: wordIndex,
            ...(needsLoadingClear && { isLoading: false }),
            ...(needsPlayingSet && { isPlaying: true }),
          };
        });
      };

      let hasAutoStarted = false;
      const handleCanPlay = () => {
        if (loadIdRef.current !== myLoadId) return;
        retryCountRef.current = 0;
        audio.playbackRate = speedRef.current;
        if (!hasAutoStarted) {
          hasAutoStarted = true;
          if (autoplayRef.current) {
            setState(prev => ({ ...prev, isLoading: false }));
            audio.play().catch(() => {
              setState(prev => ({ ...prev, isPlaying: false, isLoading: false, error: 'Tap play to start audio' }));
            });
          } else {
            setState(prev => ({ ...prev, isLoading: false, isPlaying: false }));
          }
        }
      };

      const handlePlay = () => {
        if (loadIdRef.current !== myLoadId) return;
        setState(prev => ({ ...prev, isPlaying: true, error: null }));
      };

      const handlePause = () => {
        if (loadIdRef.current !== myLoadId) return;
        if (srcChangingRef.current) return;
        setState(prev => ({ ...prev, isPlaying: false }));
      };

      const handleEnded = () => {
        if (loadIdRef.current !== myLoadId) return;
        if (repeatRef.current) {
          audio.currentTime = 0;
          audio.play();
          return;
        }
        // ── In-place chapter advance ────────────────────────────────────────
        // Swap the live audio element's src to the next chapter and call
        // .play() synchronously inside this `ended` handler. iOS WKWebView
        // treats this as a continuation of the active audio session, which
        // (a) keeps the lock-screen Now Playing card bound and (b) is the
        // only path that allows playback to start on a backgrounded /
        // locked device without a fresh user gesture.
        const curChapterId = currentChapterIdRef.current ?? chapterId;
        if (autoplayRef.current && curChapterId < 114) {
          const nextChapterId = curChapterId + 1;
          const nextUrl = getChapterAudioUrl(reciterId, nextChapterId);
          if (nextUrl) {
            inPlaceAdvanceRef.current = { chapterId: nextChapterId, reciterId };
            // Watchdog: if the React re-render + loadAudio invocation that
            // consumes this token doesn't run within 5s (e.g. the host
            // component unmounted, or AudioContext didn't propagate state),
            // clear the token so future cleanup paths can tear down normally.
            if (inPlaceWatchdogRef.current) clearTimeout(inPlaceWatchdogRef.current);
            inPlaceWatchdogRef.current = setTimeout(() => {
              inPlaceAdvanceRef.current = null;
              inPlaceWatchdogRef.current = null;
            }, 5000);
            currentChapterIdRef.current = nextChapterId;
            timingDataRef.current = null;
            currentVerseIndexRef.current = -1;
            srcChangingRef.current = true;
            audio.src = nextUrl;
            audio.load();
            audio.play().catch(() => {});
            const clearSrcFlag = () => {
              audio.removeEventListener('canplay', clearSrcFlag);
              audio.removeEventListener('loadeddata', clearSrcFlag);
              audio.removeEventListener('error', clearSrcFlag);
              srcChangingRef.current = false;
            };
            audio.addEventListener('canplay', clearSrcFlag);
            audio.addEventListener('loadeddata', clearSrcFlag);
            audio.addEventListener('error', clearSrcFlag);
            setState(prev => ({
              ...prev,
              currentVerseKey: null,
              currentWordIndex: null,
              currentTime: 0,
              duration: 0,
            }));
            // Notify React (AudioContext) so chapterId state advances and the
            // visible UI / mini-player title updates. The resulting loadAudio
            // re-invocation honors `inPlaceAdvanceRef` and skips teardown.
            onEndedRef.current?.();
            return;
          }
        }
        setState(prev => ({ ...prev, isPlaying: false }));
        onEndedRef.current?.();
      };

      const handleError = (e: Event) => {
        if (loadIdRef.current !== myLoadId) return;
        const target = e.target as HTMLAudioElement;
        const mediaError = target.error;
        if (mediaError) {
          console.error('Audio error:', mediaError.code, mediaError.message);
        }
        if (retryCountRef.current < MAX_AUTO_RETRIES) {
          retryCountRef.current++;
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 4000);
          retryTimerRef.current = setTimeout(() => {
            if (loadIdRef.current === myLoadId) loadAudio();
          }, delay);
          return;
        }
        tryVerseByVerseFallback().then(fellBack => {
          if (loadIdRef.current !== myLoadId) return;
          if (!fellBack) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              isPlaying: false,
              error: 'Audio failed to load. Tap retry to try again.',
            }));
          }
        });
      };

      // See note in VBV block: tracking `playing`/`waiting`/`stalled` keeps the mini
      // player + lock-screen icon in sync during buffer recovery and browser-initiated
      // pause/resume cycles (especially over flaky networks during online streaming).
      const handlePlaying = () => {
        if (loadIdRef.current !== myLoadId) return;
        setState(prev => ({ ...prev, isPlaying: true, isLoading: false, error: null }));
      };
      const handleWaiting = () => {
        if (loadIdRef.current !== myLoadId) return;
        setState(prev => prev.isLoading ? prev : { ...prev, isLoading: true });
      };
      const handleStalled = handleWaiting;

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('playing', handlePlaying);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('waiting', handleWaiting);
      audio.addEventListener('stalled', handleStalled);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      audio.playbackRate = speedRef.current;
      audioRef.current = audio;

      // Handle the case where audio was already ready (e.g. browser-cached)
      if (audio.readyState >= 2) handleLoadedMetadata();
      if (audio.readyState >= 3) handleCanPlay();

      cleanupRef.current = () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('playing', handlePlaying);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('waiting', handleWaiting);
        audio.removeEventListener('stalled', handleStalled);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.pause();
        audio.src = '';
        audio.remove();
        audioRef.current = null;
      };

      // ── Fetch timing data in background — audio plays while this resolves ──
      // Uses memory cache (instant) on subsequent loads, network only on first.
      const timingUrl = getTimingUrl(reciterId, chapterId);
      (async () => {
        const memCached = getTimingDataFromMemory(reciterId, chapterId);
        const timingData: TimingData = memCached ?? await (async () => {
          const timingResponse = await fetch(timingUrl, { signal: abortControllerRef.current?.signal });
          if (!timingResponse.ok) {
            const errorText = await timingResponse.text().catch(() => 'Unable to read error');
            throw new Error(`Timing API returned ${timingResponse.status}: ${errorText}`);
          }
          const rawData = await timingResponse.json() as Record<string, unknown>;
          const normalized = normalizeTimingResponse(rawData);
          const data: TimingData = { audio_files: normalized.audio_files as AudioFile[] };
          storeTimingDataInMemory(reciterId, chapterId, data);
          return data;
        })();

        if (loadIdRef.current !== myLoadId) return;

        if (!timingData.audio_files?.length || !timingData.audio_files[0]) {
          throw new Error('No audio files found in timing data');
        }
        const audioFile = timingData.audio_files[0];
        if (!audioFile.audio_url) throw new Error('No audio URL found in timing data');

        timingDataRef.current = audioFile;

        if (audio.src !== audioFile.audio_url) {
          const wasPlaying = !audio.paused;
          const swapLoadId = myLoadId;
          srcChangingRef.current = true;
          audio.src = audioFile.audio_url;
          audio.load();
          const clearFlag = () => {
            audio.removeEventListener('canplay', clearFlag);
            audio.removeEventListener('loadeddata', clearFlag);
            audio.removeEventListener('error', clearFlag);
            clearTimeout(safetyTimeout);
            if (loadIdRef.current !== swapLoadId) return;
            srcChangingRef.current = false;
            if (wasPlaying && audio.paused) {
              audio.play().catch(() => {});
            }
          };
          audio.addEventListener('canplay', clearFlag);
          audio.addEventListener('loadeddata', clearFlag);
          audio.addEventListener('error', clearFlag);
          const safetyTimeout = setTimeout(clearFlag, 3000);
        }

        // Immediately resolve current segment if audio is already mid-stream
        currentVerseIndexRef.current = -1;
        const ct = audio.currentTime;
        if (ct > 0) {
          const { verseKey, wordIndex } = findCurrentSegment(ct);
          setState(prev => {
            if (prev.currentVerseKey === verseKey && prev.currentWordIndex === wordIndex) return prev;
            if (verseKey && verseKey !== prev.currentVerseKey) {
              onVerseChangeRef.current?.(verseKey);
            }
            return { ...prev, currentVerseKey: verseKey, currentWordIndex: wordIndex };
          });
        }
      })().catch(err => {
        if (err.name === 'AbortError') return;
        if (loadIdRef.current !== myLoadId) return;
        console.error('Failed to load timing data:', err instanceof Error ? err.message : err);
        if (retryCountRef.current < MAX_AUTO_RETRIES) {
          retryCountRef.current++;
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 4000);
          retryTimerRef.current = setTimeout(() => {
            if (loadIdRef.current === myLoadId) loadAudio();
          }, delay);
          return;
        }
        tryVerseByVerseFallback().then(fellBack => {
          if (loadIdRef.current !== myLoadId) return;
          if (!fellBack) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              error: 'Audio failed to load. Tap retry to try again.',
            }));
          }
        });
      });
    } catch (error) {
      if (loadIdRef.current !== myLoadId) return;
      console.error('Failed to load audio:', error instanceof Error ? error.message : error);

      if (retryCountRef.current < MAX_AUTO_RETRIES) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 4000);
        await new Promise(resolve => {
          retryTimerRef.current = setTimeout(resolve, delay);
        });
        if (loadIdRef.current !== myLoadId) return;
        return loadAudio();
      }

      const fellBack = await tryVerseByVerseFallback();
      if (loadIdRef.current !== myLoadId) return;
      if (!fellBack) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Audio failed to load. Tap retry to try again.',
        }));
      }
    }
  }, [chapterId, reciterId, syncSpeed, findCurrentSegment, tryVerseByVerseFallback]);

  useEffect(() => {
    if (!enabled) return;
    loadIdRef.current++;
    retryCountRef.current = 0;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    loadAudio();
    return () => {
      // ── Skip teardown during in-place chapter advance ────────────────────
      // The previous chapter's `ended` handler already swapped the audio
      // element's src to the new chapter's URL and started playback. Tearing
      // down here would kill iOS's lock-screen Now Playing card and stop
      // background playback. We also intentionally do NOT bump loadIdRef so
      // the existing listeners (still attached to the same element) keep
      // updating state for the new chapter. They read currentChapterIdRef
      // when computing "next", so they remain correct after the advance.
      //
      // We only honor the token when `enabled` is still true. If the host
      // disabled audio (user stopped playback), we MUST tear down regardless
      // of the token to respect that intent.
      if (inPlaceAdvanceRef.current !== null && enabled) {
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
        return;
      }
      // Defensive: clear any lingering in-place token so it can't poison
      // a future cleanup (e.g. user navigated away before token was consumed).
      clearInPlaceAdvance();
      loadIdRef.current++;
      abortControllerRef.current?.abort();
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      if (audioContainerRef.current) {
        audioContainerRef.current.remove();
        audioContainerRef.current = null;
      }
      currentChapterIdRef.current = null;
    };
  }, [loadAudio, enabled, clearInPlaceAdvance]);

  useEffect(() => {
    if (!state.isPlaying) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }
    let active = true;
    const tick = () => {
      if (!active) return;
      const audio = audioRef.current;
      if (audio) {
        const t = audio.currentTime;
        if (verseByVerseRef.current) {
          setState(prev => {
            if (prev.currentTime === t) return prev;
            return { ...prev, currentTime: t };
          });
        } else {
          const { verseKey, wordIndex } = findCurrentSegment(t);
          setState(prev => {
            const timeChanged = prev.currentTime !== t;
            const verseChanged = prev.currentVerseKey !== verseKey;
            const wordChanged = prev.currentWordIndex !== wordIndex;
            if (!timeChanged && !verseChanged && !wordChanged) return prev;
            if (verseKey && verseChanged) onVerseChangeRef.current?.(verseKey);
            return { ...prev, currentTime: t, currentVerseKey: verseKey, currentWordIndex: wordIndex };
          });
        }
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [state.isPlaying, findCurrentSegment]);

  useEffect(() => {
    const id = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || srcChangingRef.current) return;
      const playing = !audio.paused && !audio.ended && audio.readyState >= 2;
      setState(prev => {
        if (prev.isPlaying === playing) return prev;
        if (!playing && prev.isLoading) return prev;
        return { ...prev, isPlaying: playing };
      });
    }, 500);
    return () => clearInterval(id);
  }, []);

  const retry = useCallback(() => {
    retryCountRef.current = 0;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    loadAudio();
  }, [loadAudio]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (vbvSkipTimerRef.current) {
        clearTimeout(vbvSkipTimerRef.current);
        vbvSkipTimerRef.current = null;
      }
      for (const [, audio] of vbvPreloadRef.current) {
        audio.pause();
        audio.src = '';
        audio.remove();
      }
      vbvPreloadRef.current.clear();
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      } else if (audioRef.current) {
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
      audioRef.current.play().catch(() => {
        setState(prev => ({ ...prev, error: 'Tap play to start audio' }));
      });
    }
  }, [state.isPlaying]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (state.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        setState(prev => ({ ...prev, error: 'Tap play to start audio' }));
      });
    }
  }, [state.isPlaying]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      currentVerseIndexRef.current = -1; // invalidate cached verse position
      const { verseKey, wordIndex } = findCurrentSegment(time);
      setState(prev => ({
        ...prev,
        currentTime: time,
        currentVerseKey: verseKey,
        currentWordIndex: wordIndex,
      }));
    }
  }, [findCurrentSegment]);

  const seekToVerse = useCallback((verseKey: string) => {
    if (verseByVerseRef.current) {
      const parts = verseKey.split(':');
      const verseNum = parseInt(parts[1], 10);
      if (isNaN(verseNum)) return;
      const reciterString = quranComIdToReciterString(reciterId);
      if (!reciterString) return;
      const wasPlaying = state.isPlaying;
      loadVerseByVerseAudio(verseNum, wasPlaying, reciterString);
      return;
    }

    if (!timingDataRef.current) return;

    const verseTiming = timingDataRef.current.verse_timings.find(
      t => t.verse_key === verseKey
    );

    if (verseTiming && audioRef.current) {
      const seekTime = verseTiming.timestamp_from / 1000;
      audioRef.current.currentTime = seekTime;
      currentVerseIndexRef.current = -1; // invalidate cached verse position
      const { verseKey: newVerseKey, wordIndex: newWordIndex } = findCurrentSegment(seekTime);
      setState(prev => ({
        ...prev,
        currentTime: seekTime,
        currentVerseKey: newVerseKey,
        currentWordIndex: newWordIndex,
      }));
    }
  }, [findCurrentSegment, reciterId, state.isPlaying, loadVerseByVerseAudio]);

  const setSpeed = useCallback((newSpeed: number) => {
    speedRef.current = newSpeed;
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
    setState(prev => ({ ...prev, speed: newSpeed }));
    setGlobalSpeed(newSpeed).catch(() => {});
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
    retry,
  };
}
