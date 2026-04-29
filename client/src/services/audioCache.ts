import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export interface CachedFileEntry {
  reciterId: string;
  surahNumber: number;
  verseNumber: number;
  filePath: string;
  sizeBytes: number;
  cachedAt: string;
  lastAccessedAt: string;
  source: 'cache' | 'download';
}

export interface CacheManifest {
  version: number;
  totalSizeBytes: number;
  maxSizeBytes: number;
  files: Record<string, CachedFileEntry>;
}

const MANIFEST_DIR = 'audio-cache';
const MANIFEST_PATH = 'audio-cache/manifest.json';
const AUDIO_DOWNLOAD_DIR = 'audio-downloads';
const DEFAULT_MAX_SIZE = 2147483648;

let manifest: CacheManifest | null = null;

export function fileKey(reciterId: string, surahNum: number, verseNum: number): string {
  return `${reciterId}_${surahNum}_${verseNum}`;
}

function createDefaultManifest(): CacheManifest {
  return {
    version: 1,
    totalSizeBytes: 0,
    maxSizeBytes: DEFAULT_MAX_SIZE,
    files: {},
  };
}

export async function ensureDataDirectory(path: string): Promise<void> {
  try {
    await Filesystem.mkdir({
      path,
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
  }
}

export async function saveManifest(): Promise<void> {
  if (!manifest) return;
  try {
    await ensureDataDirectory(MANIFEST_DIR);
    await Filesystem.writeFile({
      path: MANIFEST_PATH,
      data: JSON.stringify(manifest),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
  } catch (err) {
    console.error('[AudioCache] Failed to save manifest:', err);
  }
}

export async function initAudioCache(): Promise<void> {
  try {
    const result = await Filesystem.readFile({
      path: MANIFEST_PATH,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    manifest = JSON.parse(result.data as string) as CacheManifest;
    let changed = false;
    for (const [key, entry] of Object.entries(manifest.files)) {
      if (entry.source !== 'download') {
        manifest.totalSizeBytes -= entry.sizeBytes;
        delete manifest.files[key];
        changed = true;
      }
    }
    if (manifest.totalSizeBytes < 0) manifest.totalSizeBytes = 0;
    if (changed) await saveManifest();
  } catch {
    manifest = createDefaultManifest();
    await saveManifest();
  }

  try {
    await Filesystem.rmdir({
      path: 'audio-cache',
      directory: Directory.Cache,
      recursive: true,
    });
  } catch {
  }
}

export async function getCachedAudioUri(
  reciterId: string,
  surahNum: number,
  verseNum: number
): Promise<string | null> {
  if (!manifest) return null;
  const key = fileKey(reciterId, surahNum, verseNum);
  const entry = manifest.files[key];
  if (!entry) return null;

  try {
    if (Capacitor.isNativePlatform()) {
      await Filesystem.stat({ path: entry.filePath, directory: Directory.Data });
    }

    entry.lastAccessedAt = new Date().toISOString();
    saveManifest().catch(() => {});

    if (Capacitor.isNativePlatform()) {
      const uriResult = await Filesystem.getUri({
        path: entry.filePath,
        directory: Directory.Data,
      });
      return Capacitor.convertFileSrc(uriResult.uri);
    }

    const fileResult = await Filesystem.readFile({
      path: entry.filePath,
      directory: Directory.Data,
    });
    const base64String = fileResult.data as string;
    return `data:audio/mpeg;base64,${base64String}`;
  } catch (err) {
    console.error('[AudioCache] Downloaded file not found on disk, removing entry:', err);
    manifest.totalSizeBytes -= entry.sizeBytes;
    delete manifest.files[key];
    saveManifest().catch(() => {});
    return null;
  }
}


export function isVerseCached(reciterId: string, surahNum: number, verseNum: number): boolean {
  if (!manifest) return false;
  return fileKey(reciterId, surahNum, verseNum) in manifest.files;
}

export function isSurahFullyCached(reciterId: string, surahNum: number, totalVerses: number): boolean {
  if (!manifest) return false;
  for (let v = 1; v <= totalVerses; v++) {
    if (!isVerseCached(reciterId, surahNum, v)) return false;
  }
  return true;
}

export function getManifest(): CacheManifest | null {
  return manifest;
}

export function removeManifestEntry(key: string): void {
  if (!manifest) return;
  const entry = manifest.files[key];
  if (entry) {
    manifest.totalSizeBytes -= entry.sizeBytes;
    delete manifest.files[key];
  }
}

const TIMING_DATA_DIR = 'audio-downloads';

export async function saveOfflineTimingData(
  reciterId: string,
  surahNum: number,
  data: unknown
): Promise<void> {
  const dirPath = `${TIMING_DATA_DIR}/${reciterId}`;
  const filePath = `${dirPath}/timing_${surahNum}.json`;
  try {
    await ensureDataDirectory(dirPath);
    await Filesystem.writeFile({
      path: filePath,
      data: JSON.stringify(data),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
  } catch (err) {
    console.error('[AudioCache] Failed to save offline timing data:', err);
  }
}

export async function getOfflineTimingData(
  reciterId: string,
  surahNum: number
): Promise<unknown | null> {
  const filePath = `${TIMING_DATA_DIR}/${reciterId}/timing_${surahNum}.json`;
  try {
    const result = await Filesystem.readFile({
      path: filePath,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    return JSON.parse(result.data as string);
  } catch {
    return null;
  }
}

export function getDownloadedVerseNumbers(
  reciterId: string,
  surahNum: number
): number[] {
  if (!manifest) return [];
  const verses: number[] = [];
  for (const entry of Object.values(manifest.files)) {
    if (
      entry.reciterId === reciterId &&
      entry.surahNumber === surahNum &&
      entry.source === 'download' &&
      entry.verseNumber > 0
    ) {
      verses.push(entry.verseNumber);
    }
  }
  return verses.sort((a, b) => a - b);
}

export function chapterFileKey(reciterId: string, surahNum: number): string {
  return `${reciterId}_chapter_${surahNum}`;
}

export function isFullChapterDownloaded(reciterId: string, surahNum: number): boolean {
  if (!manifest) return false;
  const key = chapterFileKey(reciterId, surahNum);
  const entry = manifest.files[key];
  return !!entry && entry.source === 'download';
}

let activeDownloadXhr: XMLHttpRequest | null = null;

export function abortActiveDownload(): void {
  if (activeDownloadXhr) {
    activeDownloadXhr.abort();
    activeDownloadXhr = null;
  }
}

export async function saveFullChapterAudio(
  reciterId: string,
  surahNum: number,
  remoteUrl: string,
  onProgress?: (percent: number) => void
): Promise<boolean> {
  if (!manifest) return false;

  const key = chapterFileKey(reciterId, surahNum);
  const existing = manifest.files[key];
  if (existing && existing.source === 'download') return true;

  const dirPath = `${AUDIO_DOWNLOAD_DIR}/${reciterId}`;
  const filePath = `${dirPath}/chapter_${surahNum}.mp3`;

  try {
    await ensureDataDirectory(dirPath);

    const arrayBuffer = await downloadWithProgress(remoteUrl, onProgress);
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode(...Array.from(slice));
    }
    const base64 = btoa(binary);
    await Filesystem.writeFile({
      path: filePath,
      data: base64,
      directory: Directory.Data,
    });

    let sizeBytes = 0;
    try {
      const stat = await Filesystem.stat({ path: filePath, directory: Directory.Data });
      sizeBytes = stat.size;
    } catch {
      sizeBytes = 0;
    }

    if (existing) {
      manifest.totalSizeBytes -= existing.sizeBytes;
    }

    const now = new Date().toISOString();
    manifest.files[key] = {
      reciterId,
      surahNumber: surahNum,
      verseNumber: 0,
      filePath,
      sizeBytes,
      cachedAt: now,
      lastAccessedAt: now,
      source: 'download',
    };
    manifest.totalSizeBytes += sizeBytes;
    await saveManifest();
    return true;
  } catch (err) {
    console.error('[AudioCache] Failed to save full chapter audio:', err);
    return false;
  }
}

function downloadWithProgress(
  url: string,
  onProgress?: (percent: number) => void
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    activeDownloadXhr = xhr;
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onprogress = (event) => {
      if (onProgress && event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      activeDownloadXhr = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as ArrayBuffer);
      } else {
        reject(new Error(`Download failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => { activeDownloadXhr = null; reject(new Error('Network error during download')); };
    xhr.ontimeout = () => { activeDownloadXhr = null; reject(new Error('Download timed out')); };
    xhr.onabort = () => { activeDownloadXhr = null; reject(new Error('Download cancelled')); };
    xhr.send();
  });
}

export async function getFullChapterAudioUri(
  reciterId: string,
  surahNum: number
): Promise<string | null> {
  if (!manifest) return null;
  const key = chapterFileKey(reciterId, surahNum);
  const entry = manifest.files[key];
  if (!entry) return null;

  try {
    if (Capacitor.isNativePlatform()) {
      await Filesystem.stat({ path: entry.filePath, directory: Directory.Data });
    }

    entry.lastAccessedAt = new Date().toISOString();
    saveManifest().catch(() => {});

    if (Capacitor.isNativePlatform()) {
      const uriResult = await Filesystem.getUri({
        path: entry.filePath,
        directory: Directory.Data,
      });
      return Capacitor.convertFileSrc(uriResult.uri);
    }

    const fileResult = await Filesystem.readFile({
      path: entry.filePath,
      directory: Directory.Data,
    });
    const base64String = fileResult.data as string;
    return `data:audio/mpeg;base64,${base64String}`;
  } catch (err) {
    console.error('[AudioCache] Full chapter file not found on disk, removing entry:', err);
    manifest.totalSizeBytes -= entry.sizeBytes;
    delete manifest.files[key];
    saveManifest().catch(() => {});
    return null;
  }
}
