const CACHE_NAME = 'quran-audio-cache-v1';
const TIMING_CACHE_NAME = 'quran-timing-cache-v1';
const MAX_CACHED_CHAPTERS = 50;
const LRU_KEY = 'quran-audio-cache-lru';
const AUDIO_KEY_PREFIX = 'audio';

function getLRUList(): string[] {
  try {
    const stored = localStorage.getItem(LRU_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setLRUList(list: string[]): void {
  try {
    localStorage.setItem(LRU_KEY, JSON.stringify(list));
  } catch {
  }
}

function touchLRU(key: string): void {
  const list = getLRUList();
  const filtered = list.filter(k => k !== key);
  filtered.unshift(key);
  setLRUList(filtered);
}

function audioCacheKey(reciterId: number, chapterId: number): string {
  return `${AUDIO_KEY_PREFIX}-${reciterId}-${chapterId}`;
}

function timingCacheKey(reciterId: number, chapterId: number): string {
  return `timing-${reciterId}-${chapterId}`;
}

function lruKey(reciterId: number, chapterId: number): string {
  return `${reciterId}-${chapterId}`;
}

async function evictIfNeeded(): Promise<void> {
  const list = getLRUList();
  if (list.length <= MAX_CACHED_CHAPTERS) return;

  const toEvict = list.slice(MAX_CACHED_CHAPTERS);
  const audioCache = await caches.open(CACHE_NAME);
  const timingCache = await caches.open(TIMING_CACHE_NAME);

  for (const key of toEvict) {
    const [reciterStr, chapterStr] = key.split('-');
    const reciterId = parseInt(reciterStr);
    const chapterId = parseInt(chapterStr);
    if (!isNaN(reciterId) && !isNaN(chapterId)) {
      await audioCache.delete(new Request(audioCacheKey(reciterId, chapterId)));
      await timingCache.delete(new Request(timingCacheKey(reciterId, chapterId)));
    }
  }

  setLRUList(list.slice(0, MAX_CACHED_CHAPTERS));
}

function isCacheAvailable(): boolean {
  return typeof caches !== 'undefined';
}

export async function getCachedTimingData(reciterId: number, chapterId: number): Promise<Response | null> {
  if (!isCacheAvailable()) return null;
  try {
    const cache = await caches.open(TIMING_CACHE_NAME);
    const key = timingCacheKey(reciterId, chapterId);
    const match = await cache.match(key);
    if (match) {
      touchLRU(lruKey(reciterId, chapterId));
    }
    return match || null;
  } catch {
    return null;
  }
}

export async function cacheTimingData(reciterId: number, chapterId: number, response: Response): Promise<void> {
  if (!isCacheAvailable()) return;
  try {
    const cache = await caches.open(TIMING_CACHE_NAME);
    const key = timingCacheKey(reciterId, chapterId);
    await cache.put(new Request(key), response.clone());
    touchLRU(lruKey(reciterId, chapterId));
    await evictIfNeeded();
  } catch {
  }
}

export async function getCachedAudioUrl(reciterId: number, chapterId: number): Promise<string | null> {
  if (!isCacheAvailable()) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const key = audioCacheKey(reciterId, chapterId);
    const match = await cache.match(key);
    if (match) {
      touchLRU(lruKey(reciterId, chapterId));
      const blob = await match.blob();
      return URL.createObjectURL(blob);
    }
    return null;
  } catch {
    return null;
  }
}

export async function cacheAudioFile(audioUrl: string, reciterId: number, chapterId: number): Promise<void> {
  if (!isCacheAvailable()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const key = audioCacheKey(reciterId, chapterId);
    const existing = await cache.match(key);
    if (existing) return;

    const response = await fetch(audioUrl);
    if (response.ok) {
      await cache.put(new Request(key), response.clone());
      touchLRU(lruKey(reciterId, chapterId));
      await evictIfNeeded();
    }
  } catch {
  }
}
