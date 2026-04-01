import { useState, useEffect, useRef, useCallback } from 'react';
import { getCachedTimingData, cacheTimingData, getCachedAudioUrl, cacheAudioFile, getTimingDataFromMemory, storeTimingDataInMemory } from '@/lib/audioCache';
import { getItem, setItem, removeItem } from '@/lib/storage';
import {
  getCachedAudioUri,
  getDownloadedVerseNumbers,
  getOfflineTimingData,
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

  const findCurrentSegment = useCallback((currentTime: number) => {
    if (!timingDataRef.current) return { verseKey: null, wordIndex: null };

    const timings = timingDataRef.current.verse_timings;
    const currentTimeMs = currentTime * 1000;
    
    for (const timing of timings) {
      if (currentTimeMs >= timing.timestamp_from && currentTimeMs < timing.timestamp_to) {
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
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vbvSkipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setState(prev => ({
        ...prev,
        duration: audio.duration || 0,
        currentTime: 0,
      }));
    };

    const handleTimeUpdate = () => {
      const ct = audio.currentTime;
      let wordIndex: number | null = null;
      if (verseTiming) {
        wordIndex = findVbvWordIndex(ct, verseTiming);
      }
      setState(prev => ({
        ...prev,
        currentTime: ct,
        currentWordIndex: wordIndex,
      }));
    };

    const handleCanPlay = () => {
      audio.playbackRate = speedRef.current;
      setState(prev => ({ ...prev, isLoading: false }));
      if (shouldPlay) {
        audio.play().catch(() => {
          setState(prev => ({ ...prev, isPlaying: false, error: 'Tap play to start audio' }));
        });
      }
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true, error: null }));
      preloadNextVerses(verseNum, reciterString);
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleEnded = () => {
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
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
        error: `Failed to play verse ${verseNum} offline`,
      }));
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    cleanupRef.current = () => {
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
        setState(prev => ({ ...prev, isLoading: false, duration: audio.duration || 0, currentTime: 0 }));
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
    const myLoadId = loadIdRef.current;
    let audioCachePromise: Promise<string | null> | null = null;
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

      setState(prev => ({ ...prev, isLoading: true, error: null, currentVerseKey: null, currentWordIndex: null, currentTime: 0, duration: 0 }));

      syncSpeed();

      const reciterString = quranComIdToReciterString(reciterId);
      if (reciterString) {
        const downloadedVerses = getDownloadedVerseNumbers(reciterString, chapterId);
        if (downloadedVerses.length > 0) {
          const offlineTiming = await getOfflineTimingData(reciterString, chapterId) as TimingData | null;
          if (loadIdRef.current !== myLoadId) return;
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
          if (loadIdRef.current !== myLoadId) return;
          return;
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

      audioCachePromise = getCachedAudioUrl(reciterId, chapterId);

      const predictableUrl = getChapterAudioUrl(reciterId, chapterId);
      if (predictableUrl) {
        audio.src = predictableUrl;
        audio.load();
      }

      const timingUrl = getTimingUrl(reciterId, chapterId);

      const fetchTimingData = async (): Promise<TimingData> => {
        const memCached = getTimingDataFromMemory(reciterId, chapterId);
        if (memCached) return memCached;

        const cachedTiming = await getCachedTimingData(reciterId, chapterId);
        if (cachedTiming) {
          const data = await cachedTiming.json() as TimingData;
          storeTimingDataInMemory(reciterId, chapterId, data);
          return data;
        }

        const timingResponse = await fetch(timingUrl);
        if (!timingResponse.ok) {
          const errorText = await timingResponse.text().catch(() => 'Unable to read error');
          throw new Error(`Timing API returned ${timingResponse.status}: ${errorText}`);
        }

        const rawData = await timingResponse.json() as Record<string, unknown>;
        const normalized = normalizeTimingResponse(rawData);
        const data: TimingData = { audio_files: normalized.audio_files as AudioFile[] };
        const cacheResponse = new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
        });
        cacheTimingData(reciterId, chapterId, cacheResponse).catch(() => {});
        storeTimingDataInMemory(reciterId, chapterId, data);
        return data;
      };

      const [timingData, cachedBlobUrl] = await Promise.all([
        fetchTimingData(),
        audioCachePromise,
      ]);

      if (loadIdRef.current !== myLoadId) {
        audio.pause();
        audio.src = '';
        audio.remove();
        if (cachedBlobUrl) URL.revokeObjectURL(cachedBlobUrl);
        container.remove();
        return;
      }

      if (!timingData.audio_files || !Array.isArray(timingData.audio_files) || timingData.audio_files.length === 0) {
        throw new Error('No audio files found in timing data');
      }
      
      const audioFile = timingData.audio_files[0];
      
      if (!audioFile) {
        throw new Error('Audio file data is missing');
      }
      
      timingDataRef.current = audioFile;

      const audioUrl = audioFile.audio_url;
      if (!audioUrl) {
        throw new Error('No audio URL found in timing data');
      }

      let effectiveAudioUrl: string;
      if (cachedBlobUrl) {
        effectiveAudioUrl = cachedBlobUrl;
      } else {
        effectiveAudioUrl = audioUrl;
        cacheAudioFile(audioUrl, reciterId, chapterId).catch(() => {});
      }

      const alreadyPreloading = audio.src && audio.src === effectiveAudioUrl;
      if (!alreadyPreloading) {
        audio.src = effectiveAudioUrl;
        audio.load();
      }

      const handleLoadedMetadata = () => {
        if (loadIdRef.current !== myLoadId) return;
        setState(prev => ({ 
          ...prev, 
          duration: audio.duration || 0,
          currentTime: 0
        }));
      };

      const handleTimeUpdate = () => {
        if (loadIdRef.current !== myLoadId) return;
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
        if (loadIdRef.current !== myLoadId) return;
        retryCountRef.current = 0;
        audio.playbackRate = speedRef.current;
        
        if (autoplayRef.current) {
          setState(prev => ({ ...prev, isLoading: false }));
          audio.play().catch(() => {
            setState(prev => ({ ...prev, isPlaying: false, isLoading: false, error: 'Tap play to start audio' }));
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false, isPlaying: false }));
        }
      };

      const handlePlay = () => {
        if (loadIdRef.current !== myLoadId) return;
        setState(prev => ({ ...prev, isPlaying: true, error: null }));
      };

      const handlePause = () => {
        if (loadIdRef.current !== myLoadId) return;
        setState(prev => ({ 
          ...prev, 
          isPlaying: false
        }));
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
            if (loadIdRef.current === myLoadId) {
              loadAudio();
            }
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

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      audio.playbackRate = speedRef.current;

      audioRef.current = audio;

      const cleanup = () => {
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
        audioRef.current = null;
      };
      cleanupRef.current = cleanup;
    } catch (error) {
      if (loadIdRef.current !== myLoadId) return;
      console.error('Failed to load audio:', error instanceof Error ? error.message : error);

      if (audioCachePromise) {
        audioCachePromise.then(url => { if (url) URL.revokeObjectURL(url); }).catch(() => {});
      }

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
      loadIdRef.current++;
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
    };
  }, [loadAudio, enabled]);

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
      setState(prev => ({ ...prev, currentTime: time }));
    }
  }, []);

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
