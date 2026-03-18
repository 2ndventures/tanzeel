import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

interface CachedFileEntry {
  reciterId: string;
  surahNumber: number;
  verseNumber: number;
  filePath: string;
  sizeBytes: number;
  cachedAt: string;
  lastAccessedAt: string;
  source: 'cache' | 'download';
}

interface CacheManifest {
  version: number;
  totalSizeBytes: number;
  maxSizeBytes: number;
  files: Record<string, CachedFileEntry>;
}

const MANIFEST_DIR = 'audio-cache';
const MANIFEST_PATH = 'audio-cache/manifest.json';
const AUDIO_CACHE_DIR = 'audio-cache';
const DEFAULT_MAX_SIZE = 2147483648;

let manifest: CacheManifest | null = null;

function fileKey(reciterId: string, surahNum: number, verseNum: number): string {
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

async function ensureCacheDirectory(path: string): Promise<void> {
  try {
    await Filesystem.mkdir({
      path,
      directory: Directory.Cache,
      recursive: true,
    });
  } catch {
  }
}

async function ensureDataDirectory(path: string): Promise<void> {
  try {
    await Filesystem.mkdir({
      path,
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
  }
}

async function saveManifest(): Promise<void> {
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

async function evictLRU(): Promise<void> {
  if (!manifest) return;
  if (manifest.totalSizeBytes <= manifest.maxSizeBytes) return;

  const targetSize = Math.floor(manifest.maxSizeBytes * 0.9);
  const entries = Object.entries(manifest.files).sort(
    ([, a], [, b]) => new Date(a.lastAccessedAt).getTime() - new Date(b.lastAccessedAt).getTime()
  );

  for (const [key, entry] of entries) {
    if (manifest.totalSizeBytes <= targetSize) break;
    try {
      await Filesystem.deleteFile({
        path: entry.filePath,
        directory: Directory.Cache,
      });
      manifest.totalSizeBytes -= entry.sizeBytes;
      delete manifest.files[key];
    } catch (err) {
      console.error('[AudioCache] Failed to delete during eviction:', err);
    }
  }

  await saveManifest();
}

export async function initAudioCache(): Promise<void> {
  try {
    const result = await Filesystem.readFile({
      path: MANIFEST_PATH,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    manifest = JSON.parse(result.data as string) as CacheManifest;
  } catch {
    manifest = createDefaultManifest();
    await saveManifest();
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
    await Filesystem.stat({
      path: entry.filePath,
      directory: Directory.Cache,
    });

    entry.lastAccessedAt = new Date().toISOString();
    saveManifest().catch(() => {});

    if (Capacitor.isNativePlatform()) {
      const uriResult = await Filesystem.getUri({
        path: entry.filePath,
        directory: Directory.Cache,
      });
      return Capacitor.convertFileSrc(uriResult.uri);
    }

    const fileResult = await Filesystem.readFile({
      path: entry.filePath,
      directory: Directory.Cache,
    });
    const base64String = fileResult.data as string;
    return `data:audio/mpeg;base64,${base64String}`;
  } catch (err) {
    console.error('[AudioCache] Cached file not found on disk, removing entry:', err);
    manifest.totalSizeBytes -= entry.sizeBytes;
    delete manifest.files[key];
    saveManifest().catch(() => {});
    return null;
  }
}

export async function cacheAudioFile(
  reciterId: string,
  surahNum: number,
  verseNum: number,
  remoteUrl: string,
  source: 'cache' | 'download' = 'cache'
): Promise<void> {
  if (!manifest) return;
  const key = fileKey(reciterId, surahNum, verseNum);
  if (manifest.files[key]) return;

  const dirPath = `${AUDIO_CACHE_DIR}/${reciterId}`;
  const filePath = `${dirPath}/${surahNum}_${verseNum}.mp3`;

  try {
    await ensureCacheDirectory(dirPath);

    if (Capacitor.isNativePlatform()) {
      const downloadResult = await Filesystem.downloadFile({
        url: remoteUrl,
        path: filePath,
        directory: Directory.Cache,
      });

      if (!downloadResult.path) {
        console.error('[AudioCache] Download returned no path');
        return;
      }
    } else {
      const response = await fetch(remoteUrl);
      if (!response.ok) {
        console.error('[AudioCache] Failed to fetch audio:', response.status);
        return;
      }
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      await Filesystem.writeFile({
        path: filePath,
        data: base64,
        directory: Directory.Cache,
      });
    }

    let sizeBytes = 0;
    try {
      const stat = await Filesystem.stat({
        path: filePath,
        directory: Directory.Cache,
      });
      sizeBytes = stat.size;
    } catch {
      sizeBytes = 0;
    }

    const now = new Date().toISOString();
    manifest.files[key] = {
      reciterId,
      surahNumber: surahNum,
      verseNumber: verseNum,
      filePath,
      sizeBytes,
      cachedAt: now,
      lastAccessedAt: now,
      source,
    };
    manifest.totalSizeBytes += sizeBytes;

    await saveManifest();
    await evictLRU();
  } catch (err) {
    console.error('[AudioCache] Failed to cache audio file:', err);
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

export function getCacheStats(): { totalSizeBytes: number; maxSizeBytes: number; fileCount: number } {
  if (!manifest) {
    return { totalSizeBytes: 0, maxSizeBytes: DEFAULT_MAX_SIZE, fileCount: 0 };
  }
  return {
    totalSizeBytes: manifest.totalSizeBytes,
    maxSizeBytes: manifest.maxSizeBytes,
    fileCount: Object.keys(manifest.files).length,
  };
}

export async function clearCache(): Promise<void> {
  if (!manifest) return;
  try {
    try {
      await Filesystem.rmdir({
        path: AUDIO_CACHE_DIR,
        directory: Directory.Cache,
        recursive: true,
      });
    } catch {
    }

    manifest = createDefaultManifest();
    await saveManifest();
  } catch (err) {
    console.error('[AudioCache] Failed to clear cache:', err);
  }
}

export async function setMaxCacheSize(bytes: number): Promise<void> {
  if (!manifest) return;
  manifest.maxSizeBytes = bytes;
  await saveManifest();
  await evictLRU();
}
