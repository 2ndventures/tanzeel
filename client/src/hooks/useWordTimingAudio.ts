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
    if (oldData) await removeItem(OLD_CHAPTER_SPEEDS_KEY);
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
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
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
  // True when the audio element has fired `waiting`/`stalled` and has not
  // yet recovered (no `playing`/`canplay`/`pause` since). Surfaces through
  // AudioContext so the Media Session layer can freeze the OS scrubber
  // while the underlying audio is buffering on a slow connection.
  isStalled: boolean;
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
  // Single persistent audio element reused across all chapter / verse / reciter
  // transitions so iOS keeps its lock-screen and background-audio binding.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);

  const repeatRef = useRef(repeat);
  const onVerseChangeRef = useRef(onVerseChange);
  const onEndedRef = useRef(onEnded);
  const speedRef = useRef(initialSpeed);
  const autoplayRef = useRef(autoplay);
  const reciterIdRef = useRef(reciterId);

  const currentChapterIdRef = useRef<number | null>(null);
  const currentVerseNumRef = useRef<number | null>(null);
  const verseByVerseRef = useRef(false);

  const timingDataRef = useRef<AudioFile | null>(null);
  const vbvAvailableVersesRef = useRef<number[]>([]);
  const vbvTimingsRef = useRef<WordSegment[]>([]);
  const vbvPreloadRef = useRef<Map<number, HTMLAudioElement>>(new Map());

  const loadIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  // Backoff: 1s, 2s, 4s, 8s, 8s ≈ 23s total before surfacing "Tap retry".
  const MAX_AUTO_RETRIES = 5;
  const RETRY_DELAY_CAP_MS = 8000;
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vbvSkipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Next-chapter pre-buffer for gapless transitions. At ≥80% playback we
  // warm a hidden <audio> with the next URL (browser HTTP-caches it) or
  // pre-resolve the local file URI for downloaded chapters.
  const prefetchAudioRef = useRef<HTMLAudioElement | null>(null);
  const prefetchedRef = useRef<{
    chapterId: number;
    reciterId: number;
    url: string;
    isOffline: boolean;
  } | null>(null);
  // Idempotency guard for the ~4Hz timeupdate firing rate.
  const prefetchTriggeredForRef = useRef<{ chapterId: number; reciterId: number } | null>(null);
  // Bridge refs let the audio-element listeners (set up in a useEffect
  // closure) reach into callbacks declared later in the file without
  // becoming deps of that effect.
  const startPrefetchRef = useRef<() => void>(() => {});

  // Stall watchdog: 'waiting'/'stalled' has no built-in timeout, so escalate
  // to the error-recovery cascade after 8s of no progress.
  const stallWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const STALL_WATCHDOG_MS = 8000;
  const triggerErrorRecoveryRef = useRef<() => void>(() => {});
  // Re-entry gate so the watchdog escalation and a near-simultaneous
  // native 'error' event don't both kick off recovery chains.
  const recoveryInFlightRef = useRef(false);
  // Position to seek to once a backoff-retry's loadAudio reaches metadata.
  // Tagged with chapter+reciter so a user-initiated chapter change between
  // the retry timer firing and loadAudio consuming the ref can't seek the
  // wrong chapter to a stale position.
  const pendingResumePositionRef = useRef<{
    chapterId: number;
    reciterId: number;
    position: number;
  } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const currentVerseIndexRef = useRef<number>(-1);
  // Suppresses pause-state updates while the browser unloads/loads a new src.
  const srcChangingRef = useRef(false);
  // Wall-clock ms when srcChangingRef was last set. Used to bound the
  // pause-suppression window so a real user pause during loading is never
  // swallowed indefinitely.
  const srcChangingAtRef = useRef(0);
  // Watchdog timer that reconciles isPlaying after a src swap if neither
  // 'playing' nor 'pause'/'error' arrives within a few seconds (rare
  // WKWebView quirk).
  const swapWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // When handleEnded does an in-place chapter swap, the React-side
  // setActiveChapter() callback also fires, triggering loadAudio for the
  // SAME chapterId. We mark the chapter id + reciter here so loadAudio
  // knows to skip the redundant src reload (which would reset the audio
  // element and cause a visible play→spinner→play flicker) and only
  // refresh timing data. Reciter is part of the token so a reciter change
  // (which keeps chapterId the same) still triggers a real reload.
  const inPlaceAdvanceTokenRef = useRef<{ chapterId: number; reciterId: number } | null>(null);
  // Mirror of state.isPlaying for stable transport callbacks (used as a
  // fallback only — the audio element's `paused` property is preferred
  // since it's always current).
  const isPlayingRef = useRef(false);

  // Tracks the most recent in-flight "play when ready" attempt so a new
  // src swap (or another playWhenReady call) can cancel it. Without this,
  // a stale canplay listener from a prior src could fire after we've
  // already moved on, causing two competing play() calls.
  const pendingPlayRef = useRef<{ cancel: () => void } | null>(null);

  const [state, setState] = useState<WordTimingAudioState>({
    isPlaying: false,
    speed: initialSpeed,
    isLoading: true,
    error: null,
    currentTime: 0,
    duration: 0,
    currentVerseKey: null,
    currentWordIndex: null,
    isStalled: false,
  });

  useEffect(() => { isPlayingRef.current = state.isPlaying; }, [state.isPlaying]);

  // Clear the src-change suppression flag and any pending watchdog.
  const clearSrcFlag = useCallback(() => {
    srcChangingRef.current = false;
    if (swapWatchdogRef.current) {
      clearTimeout(swapWatchdogRef.current);
      swapWatchdogRef.current = null;
    }
  }, []);

  // Begin a src-swap window: mark the flag, stamp the time, arm a watchdog
  // that reconciles isPlaying against the audio element's actual paused
  // state if no settling event arrives within ~2.5s.
  const beginSrcSwap = useCallback(() => {
    srcChangingRef.current = true;
    srcChangingAtRef.current = Date.now();
    // Cancel any pending "play when ready" from a prior src — the new src
    // we're swapping in will install its own attempt below.
    if (pendingPlayRef.current) {
      pendingPlayRef.current.cancel();
      pendingPlayRef.current = null;
    }
    if (swapWatchdogRef.current) clearTimeout(swapWatchdogRef.current);
    swapWatchdogRef.current = setTimeout(() => {
      swapWatchdogRef.current = null;
      if (!srcChangingRef.current) return;
      srcChangingRef.current = false;
      const a = audioRef.current;
      if (!a) return;
      const playing = !a.paused && !a.ended && a.readyState >= 2;
      setState(prev => prev.isPlaying === playing ? prev : { ...prev, isPlaying: playing });
    }, 2500);
  }, []);

  // Wait for the audio element to be ready before calling play(). On iOS
  // WKWebView, calling play() immediately after `audio.src = ...; audio.load()`
  // hits a race: the element is still initializing the new source and play()
  // gets silently rejected (the device-log smoking gun was a "playing: Yes"
  // followed 7ms later by "playing: No" on surah change). On the simulator
  // and on desktop browsers this happens to work because the load is fast
  // enough, which is why the bug only showed up on real hardware.
  //
  // This helper:
  //   - cancels any prior pending attempt (so a rapid second swap doesn't
  //     leave a stale canplay listener around that fires later)
  //   - plays immediately if the element already has enough data buffered
  //   - otherwise waits for the next `canplay` then plays
  //   - falls back to the supplied onError after 10s if `canplay` never
  //     arrives (e.g. CDN unreachable)
  const playWhenReady = useCallback((audio: HTMLAudioElement, onError: () => void) => {
    if (pendingPlayRef.current) {
      pendingPlayRef.current.cancel();
      pendingPlayRef.current = null;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      audio.removeEventListener('canplay', onCanPlay);
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (pendingPlayRef.current === handle) pendingPlayRef.current = null;
    };

    const attemptPlay = () => {
      if (cancelled) return;
      cleanup();
      audio.play().catch(() => {
        if (!cancelled) onError();
      });
    };

    const onCanPlay = () => {
      attemptPlay();
    };

    const handle = {
      cancel: () => {
        cancelled = true;
        cleanup();
      },
    };
    pendingPlayRef.current = handle;

    // HAVE_FUTURE_DATA (3) or HAVE_ENOUGH_DATA (4) means we can play now.
    if (audio.readyState >= 3) {
      attemptPlay();
      return;
    }

    audio.addEventListener('canplay', onCanPlay);
    timer = setTimeout(() => {
      if (cancelled) return;
      cleanup();
      onError();
    }, 10000);
  }, []);

  // Forward-ref bridge: clearPrefetch is declared later as a useCallback.
  const clearPrefetchRef = useRef<() => void>(() => {});
  useEffect(() => {
    repeatRef.current = repeat;
    // No chapter advance under repeat → drop the warmer to free network/memory.
    if (repeat) clearPrefetchRef.current();
  }, [repeat]);
  useEffect(() => { onVerseChangeRef.current = onVerseChange; }, [onVerseChange]);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  useEffect(() => {
    autoplayRef.current = autoplay;
    // No chapter advance with autoplay off → drop the warmer.
    if (!autoplay) clearPrefetchRef.current();
  }, [autoplay]);
  useEffect(() => { reciterIdRef.current = reciterId; }, [reciterId]);

  const syncSpeed = useCallback(async () => {
    const savedSpeed = await getGlobalSpeed();
    const newSpeed = savedSpeed ?? initialSpeed;
    speedRef.current = newSpeed;
    setState(prev => ({ ...prev, speed: newSpeed }));
    return newSpeed;
  }, [initialSpeed]);

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

    const ci = currentVerseIndexRef.current;
    if (ci >= 0 && ci < timings.length) {
      const t = timings[ci];
      if (currentTimeMs >= t.timestamp_from && currentTimeMs < t.timestamp_to) {
        return findWordInVerse(t, currentTimeMs);
      }
      if (ci + 1 < timings.length) {
        const next = timings[ci + 1];
        if (currentTimeMs >= next.timestamp_from && currentTimeMs < next.timestamp_to) {
          currentVerseIndexRef.current = ci + 1;
          return findWordInVerse(next, currentTimeMs);
        }
      }
    }

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
    if (currentTimeMs >= (last[1] - offsetMs)) return last[0] - 1;
    return null;
  }, []);

  // VBV preload elements warm the URI/network cache; their src is transferred
  // to the persistent main element on advance.
  const preloadNextVerses = useCallback(async (
    currentVerseNum: number,
    reciterString: string
  ) => {
    const available = vbvAvailableVersesRef.current;
    const idx = available.indexOf(currentVerseNum);
    if (idx < 0) return;

    const wantSet = new Set<number>();
    for (let i = 1; i <= 2; i++) {
      if (idx + i < available.length) wantSet.add(available[idx + i]);
    }

    const map = vbvPreloadRef.current;
    for (const [v, audio] of Array.from(map.entries())) {
      if (!wantSet.has(v)) {
        audio.pause();
        audio.src = '';
        audio.remove();
        map.delete(v);
      }
    }

    if (wantSet.size === 0) return;

    const chapter = currentChapterIdRef.current;
    if (chapter === null) return;

    for (const verseNum of Array.from(wantSet)) {
      if (map.has(verseNum)) continue;
      const uri = await getCachedAudioUri(reciterString, chapter, verseNum);
      if (!uri) continue;
      if (map.has(verseNum)) continue;

      const preloadAudio = document.createElement('audio');
      preloadAudio.preload = 'auto';
      preloadAudio.src = uri;
      preloadAudio.load();
      map.set(verseNum, preloadAudio);
    }
  }, []);

  // Tear down the pre-buffered next-chapter element. Idempotent.
  const clearPrefetch = useCallback(() => {
    const a = prefetchAudioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute('src');
      try {
        a.load();
      } catch (err) {
        // Edge case: load() can throw on already-removed elements in some
        // engines. Safe to ignore — we're about to remove() anyway.
      }
      a.remove();
    }
    prefetchAudioRef.current = null;
    prefetchedRef.current = null;
    prefetchTriggeredForRef.current = null;
  }, []);
  clearPrefetchRef.current = clearPrefetch;

  // Fire-and-forget warm of the next chapter's audio + timing JSON.
  // Idempotent per (chapter, reciter) target.
  const startPrefetchForNextChapter = useCallback(async () => {
    if (repeatRef.current || !autoplayRef.current) return;
    const curChapter = currentChapterIdRef.current;
    const curReciter = reciterIdRef.current;
    if (curChapter === null || curChapter >= 114) return;
    const nextChapterId = curChapter + 1;

    const triggered = prefetchTriggeredForRef.current;
    if (
      triggered &&
      triggered.chapterId === nextChapterId &&
      triggered.reciterId === curReciter
    ) {
      return;
    }
    prefetchTriggeredForRef.current = { chapterId: nextChapterId, reciterId: curReciter };

    const reciterString = quranComIdToReciterString(curReciter);

    // Offline branch: pre-resolve the local file URI + warm timing JSON.
    if (reciterString && isFullChapterDownloaded(reciterString, nextChapterId)) {
      try {
        const uri = await getFullChapterAudioUri(reciterString, nextChapterId);
        if (
          currentChapterIdRef.current === curChapter &&
          reciterIdRef.current === curReciter &&
          uri
        ) {
          prefetchedRef.current = {
            chapterId: nextChapterId,
            reciterId: curReciter,
            url: uri,
            isOffline: true,
          };
        }
      } catch (err) {
        // Non-fatal: handleEnded falls back to the streaming URL and
        // loadAudio re-resolves offline on the React-side advance.
        console.warn('Tanzeel: prefetch URI resolve failed:', err);
      }
      if (!getTimingDataFromMemory(curReciter, nextChapterId)) {
        try {
          const off = await getOfflineTimingData(reciterString, nextChapterId) as TimingData | null;
          if (off?.audio_files?.[0]) {
            storeTimingDataInMemory(curReciter, nextChapterId, off);
          }
        } catch (err) {
          console.warn('Tanzeel: prefetch offline timing failed:', err);
        }
      }
      return;
    }

    // Streaming branch: warm a hidden <audio> so the browser HTTP-caches.
    const nextUrl = getChapterAudioUrl(curReciter, nextChapterId);
    if (!nextUrl) return;

    if (prefetchAudioRef.current) {
      prefetchAudioRef.current.pause();
      prefetchAudioRef.current.removeAttribute('src');
      prefetchAudioRef.current.remove();
      prefetchAudioRef.current = null;
    }

    const container = audioContainerRef.current;
    if (container) {
      const warmer = document.createElement('audio');
      warmer.preload = 'auto';
      warmer.muted = true; // never produce sound; we never call play()
      warmer.src = nextUrl;
      warmer.load();
      container.appendChild(warmer);
      prefetchAudioRef.current = warmer;
    }
    prefetchedRef.current = {
      chapterId: nextChapterId,
      reciterId: curReciter,
      url: nextUrl,
      isOffline: false,
    };

    if (!getTimingDataFromMemory(curReciter, nextChapterId)) {
      try {
        const r = await fetch(getTimingUrl(curReciter, nextChapterId));
        if (r.ok) {
          const raw = await r.json() as Record<string, unknown>;
          const normalized = normalizeTimingResponse(raw);
          const data: TimingData = { audio_files: normalized.audio_files as AudioFile[] };
          // Re-validate: chapter/reciter may have changed during fetch.
          if (
            currentChapterIdRef.current === curChapter &&
            reciterIdRef.current === curReciter
          ) {
            storeTimingDataInMemory(curReciter, nextChapterId, data);
          }
        }
      } catch (err) {
        console.warn('Tanzeel: prefetch timing fetch failed:', err);
      }
    }
  }, []);

  useEffect(() => {
    startPrefetchRef.current = startPrefetchForNextChapter;
  }, [startPrefetchForNextChapter]);

  const clearStallWatchdog = useCallback(() => {
    if (stallWatchdogRef.current) {
      clearTimeout(stallWatchdogRef.current);
      stallWatchdogRef.current = null;
    }
  }, []);

  // Forward refs so the persistent audio listeners can call loaders defined below.
  const loadAudioRef = useRef<() => Promise<void>>(async () => {});
  const tryVbvFallbackRef = useRef<() => Promise<boolean>>(async () => false);

  useEffect(() => {
    if (!enabled) return;

    const container = document.createElement('div');
    container.style.display = 'none';
    container.id = 'tanzeel-audio-host';
    document.body.appendChild(container);
    audioContainerRef.current = container;

    const audio = document.createElement('audio');
    audio.preload = 'auto';
    audio.playbackRate = speedRef.current;
    container.appendChild(audio);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      setState(prev => ({ ...prev, duration: dur }));
    };

    const handleTimeUpdate = () => {
      const ct = audio.currentTime;
      const actuallyPlaying = !audio.paused && !audio.ended;

      if (verseByVerseRef.current) {
        const verseNum = currentVerseNumRef.current;
        const chapter = currentChapterIdRef.current;
        if (verseNum === null || chapter === null) return;
        const verseKey = `${chapter}:${verseNum}`;
        const verseTiming = vbvTimingsRef.current.find(t => t.verse_key === verseKey);
        const wordIndex = verseTiming ? findVbvWordIndex(ct, verseTiming) : null;
        setState(prev => {
          const sameWord = prev.currentWordIndex === wordIndex;
          const sameVerse = prev.currentVerseKey === verseKey;
          const needsLoadingClear = actuallyPlaying && prev.isLoading;
          const needsPlayingSet = actuallyPlaying && !prev.isPlaying;
          if (sameWord && sameVerse && !needsLoadingClear && !needsPlayingSet) return prev;
          return {
            ...prev,
            currentVerseKey: verseKey,
            currentWordIndex: wordIndex,
            ...(needsLoadingClear && { isLoading: false }),
            ...(needsPlayingSet && { isPlaying: true }),
          };
        });
        return;
      }

      // Full-chapter mode. Prefetch trigger runs independent of timing
      // data — if the timing JSON fetch is slow or fails, gapless
      // warmup must still happen based on duration/currentTime alone.
      const durEarly = audio.duration;
      if (
        actuallyPlaying &&
        isFinite(durEarly) &&
        durEarly > 0 &&
        (ct / durEarly >= 0.8 || durEarly - ct <= 30)
      ) {
        startPrefetchRef.current();
      }

      if (!timingDataRef.current) {
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

    const handleCanPlay = () => {
      retryCountRef.current = 0;
      audio.playbackRate = speedRef.current;
      // Audio is now ready — kill any pending stall watchdog and
      // release the recovery gate so future failures can recover.
      clearStallWatchdog();
      recoveryInFlightRef.current = false;
      // Note: srcChangingRef is intentionally NOT cleared here. It only
      // clears once playback actually resumes (handlePlaying) or the
      // spurious post-swap pause is consumed (handlePause). Clearing on
      // canplay is too early — the element is still paused at this point,
      // and any reconciliation read of audio.paused would falsely flip
      // isPlaying to false and flicker the play/pause icon.
      setState(prev => {
        if (!prev.isLoading && !prev.isStalled) return prev;
        return { ...prev, isLoading: false, isStalled: false };
      });
    };

    const handleLoadedData = () => {
      // No-op: see handleCanPlay note about srcChangingRef timing.
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true, error: null }));
      if (verseByVerseRef.current) {
        const verseNum = currentVerseNumRef.current;
        const reciterString = quranComIdToReciterString(reciterIdRef.current);
        if (verseNum !== null && reciterString) {
          preloadNextVerses(verseNum, reciterString);
        }
      }
    };

    const handlePlaying = () => {
      clearSrcFlag();
      // Audio is actively producing samples — kill any pending stall
      // watchdog (the network has clearly recovered).
      clearStallWatchdog();
      setState(prev => ({ ...prev, isPlaying: true, isLoading: false, isStalled: false, error: null }));
    };

    const handlePause = () => {
      // Pause events that arrive within 300ms of a src swap are treated
      // as the browser's own teardown of the previous source and are
      // suppressed (state.isPlaying stays as-is). Outside that window
      // any pause is treated as user/system intent. The suppression flag
      // is NOT consumed in the suppressed branch — it is cleared by the
      // settling 'playing' event (clearSrcFlag), the 2.5s watchdog, an
      // error event, or a real out-of-window pause.
      if (srcChangingRef.current) {
        const withinSwapWindow = (Date.now() - srcChangingAtRef.current) <= 300;
        if (withinSwapWindow) {
          // Suppressed teardown pause from the src swap. Do NOT consume
          // srcChangingRef or cancel the watchdog: a subsequent 'playing'
          // event will clear them, or — if neither 'playing' nor a real
          // pause/error arrives — the 2.5s watchdog will reconcile state.
          // Any later teardown-style pauses inside the same window are
          // also suppressed (idempotent).
          return;
        }
        // Real user/system pause outside the swap window — clear the
        // suppression flag + watchdog and propagate.
        srcChangingRef.current = false;
        if (swapWatchdogRef.current) {
          clearTimeout(swapWatchdogRef.current);
          swapWatchdogRef.current = null;
        }
      }
      setState(prev => ({ ...prev, isPlaying: false, isStalled: false }));
    };

    // 'waiting'/'stalled' freeze the audio clock; flip isStalled so the
    // Media Session layer can pin the OS scrubber, and arm the watchdog
    // so a flaky connection escalates to recovery instead of hanging.
    const handleWaiting = () => {
      setState(prev => {
        if (prev.isLoading && prev.isStalled) return prev;
        return { ...prev, isLoading: true, isStalled: true };
      });
      if (stallWatchdogRef.current) clearTimeout(stallWatchdogRef.current);
      stallWatchdogRef.current = setTimeout(() => {
        stallWatchdogRef.current = null;
        const a = audioRef.current;
        if (!a || a !== audio) return;
        // User paused while we were waiting → don't auto-recover.
        if (a.paused) return;
        // Already buffered enough to keep going → false alarm.
        if (a.readyState >= 3) return;
        triggerErrorRecoveryRef.current();
      }, STALL_WATCHDOG_MS);
    };

    const handleEnded = () => {
      if (repeatRef.current) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }

      // VBV: in-place advance to next downloaded verse
      if (verseByVerseRef.current) {
        const curVerse = currentVerseNumRef.current;
        const available = vbvAvailableVersesRef.current;
        const chapter = currentChapterIdRef.current;
        const reciterString = quranComIdToReciterString(reciterIdRef.current);

        if (curVerse !== null && chapter !== null && reciterString) {
          const idx = available.indexOf(curVerse);
          if (idx >= 0 && idx < available.length - 1) {
            const nextVerse = available[idx + 1];
            // Prefer preloaded element's URI (synchronous, lock-screen-safe).
            const preloaded = vbvPreloadRef.current.get(nextVerse);
            if (preloaded) {
              const nextUri = preloaded.src;
              vbvPreloadRef.current.delete(nextVerse);
              preloaded.pause();
              preloaded.removeAttribute('src');
              preloaded.remove();

              beginSrcSwap();
              audio.src = nextUri;
              audio.playbackRate = speedRef.current;
              audio.load();
              playWhenReady(audio, () => {
                clearSrcFlag();
                setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
              });
              currentVerseNumRef.current = nextVerse;
              const newKey = `${chapter}:${nextVerse}`;
              currentVerseIndexRef.current = -1;
              setState(prev => ({
                ...prev,
                currentVerseKey: newKey,
                currentWordIndex: null,
                currentTime: 0,
              }));
              onVerseChangeRef.current?.(newKey);
              preloadNextVerses(nextVerse, reciterString);
              return;
            }

            // Async URI fetch fallback (less ideal for background, but the
            // preloader normally has the next 2 verses warm, so this is rare).
            const fallbackLoadId = loadIdRef.current;
            getCachedAudioUri(reciterString, chapter, nextVerse).then(uri => {
              if (loadIdRef.current !== fallbackLoadId) return;
              if (!uri) {
                setState(prev => ({ ...prev, isPlaying: false, error: `Verse ${nextVerse} file missing` }));
                return;
              }
              beginSrcSwap();
              audio.src = uri;
              audio.playbackRate = speedRef.current;
              audio.load();
              playWhenReady(audio, () => {
                clearSrcFlag();
                setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
              });
              currentVerseNumRef.current = nextVerse;
              const newKey = `${chapter}:${nextVerse}`;
              currentVerseIndexRef.current = -1;
              setState(prev => ({
                ...prev,
                currentVerseKey: newKey,
                currentWordIndex: null,
                currentTime: 0,
              }));
              onVerseChangeRef.current?.(newKey);
              preloadNextVerses(nextVerse, reciterString);
            });
            return;
          }
        }

        // No more downloaded verses — stop and notify.
        setState(prev => ({ ...prev, isPlaying: false }));
        onEndedRef.current?.();
        return;
      }

      // Full-chapter: in-place advance to next chapter.
      const curChapter = currentChapterIdRef.current;
      if (autoplayRef.current && curChapter !== null && curChapter < 114) {
        const nextChapterId = curChapter + 1;
        // Prefer the prefetched URL (browser-cached stream or pre-resolved
        // offline URI) for an instant handoff; fall back to the predictable
        // streaming URL if prefetch never ran.
        const prefetched = prefetchedRef.current;
        const nextUrl =
          prefetched &&
          prefetched.chapterId === nextChapterId &&
          prefetched.reciterId === reciterIdRef.current
            ? prefetched.url
            : getChapterAudioUrl(reciterIdRef.current, nextChapterId);

        if (nextUrl) {
          beginSrcSwap();
          // Token tells the React-side loadAudio to skip the redundant src
          // reload that would reset the element and flicker the UI.
          inPlaceAdvanceTokenRef.current = { chapterId: nextChapterId, reciterId: reciterIdRef.current };
          audio.src = nextUrl;
          audio.playbackRate = speedRef.current;
          audio.load();
          playWhenReady(audio, () => {
            clearSrcFlag();
            setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
          });
          currentChapterIdRef.current = nextChapterId;
          // Hand off pre-warmed timing JSON synchronously; loadAudio
          // re-fetches if it wasn't warmed.
          const memCachedTiming = getTimingDataFromMemory(reciterIdRef.current, nextChapterId);
          timingDataRef.current = memCachedTiming?.audio_files?.[0] ?? null;
          currentVerseIndexRef.current = -1;
          clearPrefetch();
          setState(prev => ({
            ...prev,
            currentVerseKey: null,
            currentWordIndex: null,
            currentTime: 0,
            duration: 0,
          }));
          // Notify React so AudioContext advances chapterId state.
          onEndedRef.current?.();
          return;
        }
      }

      setState(prev => ({ ...prev, isPlaying: false }));
      onEndedRef.current?.();
    };

    // Recovery cascade for streaming failures (native 'error' or 8s+ stall):
    //   1. Mid-track swap to downloaded local file at same position.
    //   2. Exponential-backoff reload (handled by retryWithBackoff).
    //   3. VBV fallback for partially-downloaded chapters.
    //   4. Surface "Tap retry" error.
    const handleError = () => {
      clearSrcFlag();
      clearStallWatchdog();
      if (recoveryInFlightRef.current) return;
      recoveryInFlightRef.current = true;

      // VBV: surface error directly; no auto-retry.
      if (verseByVerseRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isPlaying: false,
          error: 'Offline audio failed to play',
        }));
        return;
      }

      const reciterString = quranComIdToReciterString(reciterIdRef.current);
      const chapter = currentChapterIdRef.current;
      const savedPosition = audio.currentTime;

      // Step 1: mid-track offline fallback.
      if (
        reciterString &&
        chapter !== null &&
        isFullChapterDownloaded(reciterString, chapter)
      ) {
        getFullChapterAudioUri(reciterString, chapter).then(uri => {
          if (!uri) {
            // Manifest entry stale (file vanished) — fall through to retry.
            retryWithBackoff();
            return;
          }
          // Bail if the user moved on while we were resolving the URI.
          if (
            audioRef.current !== audio ||
            currentChapterIdRef.current !== chapter
          ) {
            recoveryInFlightRef.current = false;
            return;
          }
          beginSrcSwap();
          audio.src = uri;
          audio.playbackRate = speedRef.current;
          audio.load();
          // Resume from where the stream cut out. Branch on readyState
          // because metadata may already be cached for a local file —
          // 'loadedmetadata' would never fire and recovery would hang.
          const seekBack = () => {
            if (savedPosition > 0 && isFinite(savedPosition)) {
              const dur = audio.duration;
              const target = isFinite(dur) && dur > 0
                ? Math.min(savedPosition, dur - 0.1)
                : savedPosition;
              try {
                audio.currentTime = Math.max(0, target);
              } catch (err) {
                console.warn('Tanzeel: seek-back currentTime assignment failed:', err);
              }
            }
            playWhenReady(audio, () => {
              clearSrcFlag();
              setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
            });
          };
          if (audio.readyState >= 1 /* HAVE_METADATA */) {
            seekBack();
          } else {
            audio.addEventListener('loadedmetadata', seekBack, { once: true });
          }
        }).catch(() => {
          retryWithBackoff();
        });
        return;
      }

      retryWithBackoff();
    };

    const retryWithBackoff = () => {
      // Cancel any in-flight retry timer before scheduling a new one.
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (retryCountRef.current < MAX_AUTO_RETRIES) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), RETRY_DELAY_CAP_MS);
        // Capture position so the retry's loadAudio can seek back to it
        // — a 30s dropout mid-surah should resume where it dropped, not
        // restart from verse 1.
        const resumeAt = audio.currentTime;
        const resumeChapter = currentChapterIdRef.current;
        const resumeReciter = reciterIdRef.current;
        if (
          resumeAt > 0 &&
          isFinite(resumeAt) &&
          resumeChapter !== null
        ) {
          pendingResumePositionRef.current = {
            chapterId: resumeChapter,
            reciterId: resumeReciter,
            position: resumeAt,
          };
        }
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          recoveryInFlightRef.current = false;
          loadAudioRef.current();
        }, delay);
        return;
      }
      tryVbvFallbackRef.current().then(fellBack => {
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

    // Bridge ref so the stall-watchdog timeout can call handleError
    // without needing to be a dep of this useEffect.
    triggerErrorRecoveryRef.current = handleError;

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('stalled', handleWaiting);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      // Cancel any in-flight playWhenReady so its 10s timeout doesn't fire
      // a setState after the component has unmounted.
      if (pendingPlayRef.current) {
        pendingPlayRef.current.cancel();
        pendingPlayRef.current = null;
      }
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('stalled', handleWaiting);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.remove();
      container.remove();
      audioRef.current = null;
      audioContainerRef.current = null;

      for (const [, preload] of Array.from(vbvPreloadRef.current.entries())) {
        preload.pause();
        preload.removeAttribute('src');
        preload.remove();
      }
      vbvPreloadRef.current.clear();

      // Stop any in-flight stall watchdog and tear down the next-chapter
      // pre-buffer element so the hidden <audio> doesn't outlive the hook.
      clearStallWatchdog();
      clearPrefetch();
      triggerErrorRecoveryRef.current = () => {};

      currentChapterIdRef.current = null;
      currentVerseNumRef.current = null;
      verseByVerseRef.current = false;
      timingDataRef.current = null;
      currentVerseIndexRef.current = -1;
    };
  }, [enabled, findCurrentSegment, findVbvWordIndex, preloadNextVerses, clearPrefetch, clearStallWatchdog]);

  const loadVerseByVerseAudio = useCallback(async (
    verseNum: number,
    shouldPlay: boolean,
    reciterString: string
  ) => {
    const audio = audioRef.current;
    if (!audio) return;

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

    const chapter = currentChapterIdRef.current;
    if (chapter === null) return;
    const verseKey = `${chapter}:${verseNum}`;

    // Try preloaded URI for synchronous swap.
    const preloaded = vbvPreloadRef.current.get(verseNum);
    let uri: string | null = null;
    if (preloaded) {
      uri = preloaded.src;
      vbvPreloadRef.current.delete(verseNum);
      preloaded.pause();
      preloaded.removeAttribute('src');
      preloaded.remove();
    } else {
      setState(prev => ({ ...prev, isLoading: true, isStalled: false }));
      const preLoadId = loadIdRef.current;
      uri = await getCachedAudioUri(reciterString, chapter, verseNum);
      if (loadIdRef.current !== preLoadId) return;
      if (!uri) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: `Verse ${verseNum} file missing from storage`,
        }));
        return;
      }
    }

    currentVerseNumRef.current = verseNum;
    currentVerseIndexRef.current = -1;
    setState(prev => ({
      ...prev,
      currentVerseKey: verseKey,
      currentWordIndex: null,
      currentTime: 0,
      error: null,
    }));
    onVerseChangeRef.current?.(verseKey);

    beginSrcSwap();
    audio.src = uri;
    audio.playbackRate = speedRef.current;
    audio.load();

    if (shouldPlay) {
      playWhenReady(audio, () => {
        setState(prev => ({ ...prev, isPlaying: false, error: 'Tap play to start audio' }));
      });
    }
    preloadNextVerses(verseNum, reciterString);
  }, [preloadNextVerses, playWhenReady]);

  const tryVerseByVerseFallback = useCallback(async (): Promise<boolean> => {
    if (verseByVerseRef.current) return false;
    const reciterString = quranComIdToReciterString(reciterIdRef.current);
    if (!reciterString) return false;
    const chapter = currentChapterIdRef.current;
    if (chapter === null) return false;

    const downloadedVerses = getDownloadedVerseNumbers(reciterString, chapter);
    if (downloadedVerses.length === 0) return false;

    const preLoadId = loadIdRef.current;
    const offlineTiming = await getOfflineTimingData(reciterString, chapter) as TimingData | null;
    if (loadIdRef.current !== preLoadId) return false;

    if (offlineTiming?.audio_files?.[0]?.verse_timings) {
      vbvTimingsRef.current = offlineTiming.audio_files[0].verse_timings;
      timingDataRef.current = offlineTiming.audio_files[0];
    } else {
      vbvTimingsRef.current = [];
    }

    verseByVerseRef.current = true;
    vbvAvailableVersesRef.current = downloadedVerses;

    await loadVerseByVerseAudio(downloadedVerses[0], autoplayRef.current, reciterString);
    if (loadIdRef.current !== preLoadId) return false;
    return true;
  }, [loadVerseByVerseAudio]);

  tryVbvFallbackRef.current = tryVerseByVerseFallback;

  const loadAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    // In-place chapter advance just happened (handleEnded already swapped
    // src and called play()). Skip the redundant src reload here so the UI
    // doesn't flicker; still kick off a timing-data fetch in the background
    // so word highlighting catches up for the new chapter.
    // Only bail when BOTH the chapter and reciter match the in-place token
    // (a reciter change keeps chapterId the same but still requires a real
    // src reload). Any non-matching call clears the stale token so it can't
    // accidentally trigger a future bail.
    const ipToken = inPlaceAdvanceTokenRef.current;
    if (ipToken && (ipToken.chapterId !== chapterId || ipToken.reciterId !== reciterId)) {
      inPlaceAdvanceTokenRef.current = null;
    }
    if (inPlaceAdvanceTokenRef.current && inPlaceAdvanceTokenRef.current.chapterId === chapterId && inPlaceAdvanceTokenRef.current.reciterId === reciterId) {
      inPlaceAdvanceTokenRef.current = null;
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      const myLoadId = ++loadIdRef.current;
      verseByVerseRef.current = false;
      currentChapterIdRef.current = chapterId;
      currentVerseNumRef.current = null;
      timingDataRef.current = null;
      currentVerseIndexRef.current = -1;
      const reciterStringInline = quranComIdToReciterString(reciterId);
      try {
        if (reciterStringInline && isFullChapterDownloaded(reciterStringInline, chapterId)) {
          const off = await getOfflineTimingData(reciterStringInline, chapterId) as TimingData | null;
          if (loadIdRef.current === myLoadId && off?.audio_files?.[0]) {
            timingDataRef.current = off.audio_files[0];
          }
          return;
        }
        const memCached = getTimingDataFromMemory(reciterId, chapterId);
        if (memCached?.audio_files?.[0]) {
          timingDataRef.current = memCached.audio_files[0];
          return;
        }
        const r = await fetch(getTimingUrl(reciterId, chapterId), { signal });
        if (!r.ok) return;
        const raw = await r.json() as Record<string, unknown>;
        const normalized = normalizeTimingResponse(raw);
        const data: TimingData = { audio_files: normalized.audio_files as AudioFile[] };
        storeTimingDataInMemory(reciterId, chapterId, data);
        if (loadIdRef.current === myLoadId && data.audio_files?.[0]) {
          timingDataRef.current = data.audio_files[0];
        }
      } catch {
        // Non-fatal: word highlighting will be unavailable until next load.
      }
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    const myLoadId = ++loadIdRef.current;
    retryCountRef.current = 0;
    // Fresh user-initiated load — release the recovery gate so any
    // failure during this load can start a new recovery cycle. Also
    // cancel any pending retry timer the previous load may have armed.
    recoveryInFlightRef.current = false;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    // Reset playback context for full-chapter mode targeting (chapterId, reciterId).
    verseByVerseRef.current = false;
    currentChapterIdRef.current = chapterId;
    currentVerseNumRef.current = null;
    timingDataRef.current = null;
    currentVerseIndexRef.current = -1;

    // Drain any preloaded VBV elements left over from a prior VBV session.
    for (const [, preload] of Array.from(vbvPreloadRef.current.entries())) {
      preload.pause();
      preload.removeAttribute('src');
      preload.remove();
    }
    vbvPreloadRef.current.clear();

    // Snapshot the next-chapter prefetch before tearing it down so manual
    // next (mini-player / lock-screen Skip) can reuse it just like the
    // autoplay handoff in handleEnded does.
    const prefetchedSnapshot = prefetchedRef.current;
    const prefetchMatches =
      prefetchedSnapshot &&
      prefetchedSnapshot.chapterId === chapterId &&
      prefetchedSnapshot.reciterId === reciterId;
    clearPrefetch();

    setState(prev => ({
      ...prev,
      isLoading: true,
      isStalled: false,
      error: null,
      currentVerseKey: null,
      currentWordIndex: null,
      currentTime: 0,
      duration: 0,
    }));

    syncSpeed();

    const reciterString = quranComIdToReciterString(reciterId);

    // Offline full-chapter
    if (reciterString && isFullChapterDownloaded(reciterString, chapterId)) {
      try {
        const memCachedTiming = getTimingDataFromMemory(reciterId, chapterId);
        const offlineTiming = memCachedTiming
          ?? await getOfflineTimingData(reciterString, chapterId) as TimingData | null;
        if (loadIdRef.current !== myLoadId) return;
        // Reuse a pre-resolved offline URI from the prefetch when present
        // — saves the Filesystem.stat round-trip on manual next.
        const offlineUri = prefetchMatches && prefetchedSnapshot!.isOffline
          ? prefetchedSnapshot!.url
          : await getFullChapterAudioUri(reciterString, chapterId);
        if (loadIdRef.current !== myLoadId) return;

        if (offlineUri && offlineTiming?.audio_files?.[0]) {
          timingDataRef.current = offlineTiming.audio_files[0];
          beginSrcSwap();
          audio.src = offlineUri;
          audio.playbackRate = speedRef.current;
          audio.load();
          if (autoplayRef.current) {
            playWhenReady(audio, () => {
              setState(prev => ({ ...prev, isPlaying: false, isLoading: false, error: 'Tap play to start audio' }));
            });
          }
          return;
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        console.error('Tanzeel: offline full-chapter load failed:', err);
        // Fall through to online streaming.
      }
    }

    // Online streaming. Reuse the prefetched URL when it matches — the
    // browser's HTTP cache will hit on the partial download from the
    // hidden warmer element, giving us a near-instant manual-next.
    const streamingUrl = prefetchMatches && !prefetchedSnapshot!.isOffline
      ? prefetchedSnapshot!.url
      : getChapterAudioUrl(reciterId, chapterId);
    if (!streamingUrl) {
      setState(prev => ({ ...prev, isLoading: false, error: 'No audio URL available for this chapter' }));
      return;
    }

    beginSrcSwap();
    audio.src = streamingUrl;
    audio.playbackRate = speedRef.current;
    audio.load();

    // If a backoff-retry stashed a position, seek back to it so a network
    // dropout resumes mid-surah instead of restarting from verse 1.
    const pendingResume = pendingResumePositionRef.current;
    pendingResumePositionRef.current = null;
    if (
      pendingResume &&
      pendingResume.chapterId === chapterId &&
      pendingResume.reciterId === reciterId
    ) {
      const seekToResume = () => {
        const dur = audio.duration;
        const target = isFinite(dur) && dur > 0
          ? Math.min(pendingResume.position, dur - 0.1)
          : pendingResume.position;
        try {
          audio.currentTime = Math.max(0, target);
        } catch (err) {
          console.warn('Tanzeel: resume-seek currentTime assignment failed:', err);
        }
      };
      if (audio.readyState >= 1 /* HAVE_METADATA */) {
        seekToResume();
      } else {
        audio.addEventListener('loadedmetadata', seekToResume, { once: true });
      }
    }

    if (autoplayRef.current) {
      playWhenReady(audio, () => {
        setState(prev => ({ ...prev, isPlaying: false, isLoading: false, error: 'Tap play to start audio' }));
      });
    }

    // Fetch timing data in parallel; audio plays while this resolves.
    const timingUrl = getTimingUrl(reciterId, chapterId);
    try {
      const memCached = getTimingDataFromMemory(reciterId, chapterId);
      const timingData: TimingData = memCached ?? await (async () => {
        const r = await fetch(timingUrl, { signal });
        if (!r.ok) throw new Error(`Timing API ${r.status}`);
        const raw = await r.json() as Record<string, unknown>;
        const normalized = normalizeTimingResponse(raw);
        const data: TimingData = { audio_files: normalized.audio_files as AudioFile[] };
        storeTimingDataInMemory(reciterId, chapterId, data);
        return data;
      })();
      if (loadIdRef.current !== myLoadId) return;

      if (!timingData.audio_files?.[0]) throw new Error('No audio files in timing data');
      const audioFile = timingData.audio_files[0];
      if (!audioFile.audio_url) throw new Error('No audio URL in timing data');

      timingDataRef.current = audioFile;

      // If timing data has a different URL than what we predicted, swap to it.
      if (audio.src !== audioFile.audio_url) {
        const wasPlaying = !audio.paused;
        beginSrcSwap();
        audio.src = audioFile.audio_url;
        audio.playbackRate = speedRef.current;
        audio.load();
        if (wasPlaying) {
          playWhenReady(audio, () => {});
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      if (loadIdRef.current !== myLoadId) return;
      console.error('Tanzeel: timing fetch failed:', err);
      // Error handler on the audio element (or this catch) drives retry/fallback;
      // we don't trigger fallback here because audio may still be playing the
      // predicted URL successfully — only word highlighting will be missing.
    }
  }, [chapterId, reciterId, syncSpeed, clearPrefetch]);

  loadAudioRef.current = loadAudio;

  useEffect(() => {
    if (!enabled) return;
    if (!audioRef.current) return; // setup effect hasn't run yet (same render)
    loadAudio();
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (vbvSkipTimerRef.current) {
        clearTimeout(vbvSkipTimerRef.current);
        vbvSkipTimerRef.current = null;
      }
      abortControllerRef.current?.abort();
    };
  }, [chapterId, reciterId, enabled, loadAudio]);

  useEffect(() => {
    if (!state.isPlaying) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }
    let active = true;
    // Throttle currentTime state updates so the playback bar / mini-player
    // re-render at most ~12Hz (every 80ms) instead of every animation frame.
    // Word-/verse-boundary changes still flush immediately for tight
    // highlight sync.
    const TIME_DELTA_S = 0.08;
    let lastPushedTime = -1;
    const tick = () => {
      if (!active) return;
      const audio = audioRef.current;
      if (audio) {
        const t = audio.currentTime;
        if (verseByVerseRef.current) {
          if (Math.abs(t - lastPushedTime) >= TIME_DELTA_S) {
            lastPushedTime = t;
            setState(prev => prev.currentTime === t ? prev : { ...prev, currentTime: t });
          }
        } else {
          const { verseKey, wordIndex } = findCurrentSegment(t);
          const timeShouldFlush = Math.abs(t - lastPushedTime) >= TIME_DELTA_S;
          setState(prev => {
            const verseChanged = prev.currentVerseKey !== verseKey;
            const wordChanged = prev.currentWordIndex !== wordIndex;
            if (!timeShouldFlush && !verseChanged && !wordChanged) return prev;
            if (verseKey && verseChanged) onVerseChangeRef.current?.(verseKey);
            if (timeShouldFlush) lastPushedTime = t;
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

  // (Removed) 500ms safety poller. The event-driven path (play / playing /
  // pause / ended / waiting / error) covers all transitions. The poller was
  // racing with the src-swap suppression window and causing the play/pause
  // icon to flicker during chapter auto-advance.

  const retry = useCallback(() => {
    retryCountRef.current = 0;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    loadAudio();
  }, [loadAudio]);

  // Transport callbacks read `audio.paused` directly — the audio element
  // is the only source of truth that's always current, so rapid double-taps
  // can't race a stale React/ref value.
  const pauseAudio = useCallback(() => {
    const a = audioRef.current;
    if (a && !a.paused) a.pause();
  }, []);

  const playAudio = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => {
        setState(prev => ({ ...prev, error: 'Tap play to start audio' }));
      });
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => {
        setState(prev => ({ ...prev, error: 'Tap play to start audio' }));
      });
    } else {
      a.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      currentVerseIndexRef.current = -1;
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
      const reciterString = quranComIdToReciterString(reciterIdRef.current);
      if (!reciterString) return;
      loadVerseByVerseAudio(verseNum, isPlayingRef.current, reciterString);
      return;
    }

    if (!timingDataRef.current) return;
    const verseTiming = timingDataRef.current.verse_timings.find(t => t.verse_key === verseKey);
    if (verseTiming && audioRef.current) {
      const seekTime = verseTiming.timestamp_from / 1000;
      audioRef.current.currentTime = seekTime;
      currentVerseIndexRef.current = -1;
      const { verseKey: newVerseKey, wordIndex: newWordIndex } = findCurrentSegment(seekTime);
      setState(prev => ({
        ...prev,
        currentTime: seekTime,
        currentVerseKey: newVerseKey,
        currentWordIndex: newWordIndex,
      }));
    }
  }, [findCurrentSegment, loadVerseByVerseAudio]);

  const setSpeed = useCallback((newSpeed: number) => {
    speedRef.current = newSpeed;
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
    setState(prev => ({ ...prev, speed: newSpeed }));
    setGlobalSpeed(newSpeed).catch(() => {});
  }, []);

  const getTimingData = useCallback((): AudioFile | null => timingDataRef.current, []);

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
