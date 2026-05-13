import { Filesystem, Directory } from '@capacitor/filesystem';
import { getReciterById, getQuranComReciterId } from '@/lib/reciters';
import {
  fileKey,
  chapterFileKey,
  getManifest,
  removeManifestEntry,
  saveManifest,
  isFullChapterDownloaded,
  saveFullChapterAudio,
  saveOfflineTimingData,
  abortActiveDownload,
  StorageQuotaError,
} from '@/services/audioCache';
import { chapters } from '@/lib/quranMetadata';
import { setItem, getItem, removeItem } from '@/lib/storage';
import { getTimingUrl, getChapterAudioUrl, normalizeTimingResponse } from '@/lib/audioUrls';

const PENDING_DOWNLOAD_KEY = 'pendingDownload';

/** 150 MB — minimum free space required before a download is allowed to start. */
const MIN_FREE_BYTES = 150 * 1024 * 1024;

const STORAGE_ERROR_MSG = 'Not enough storage. Free up space and try again.';

export interface PendingDownload {
  type: 'surah' | 'all';
  reciterId: string;
  surahNum?: number;
}

export async function savePendingDownload(pending: PendingDownload): Promise<void> {
  await setItem(PENDING_DOWNLOAD_KEY, JSON.stringify(pending));
}

export async function getPendingDownload(): Promise<PendingDownload | null> {
  const raw = await getItem(PENDING_DOWNLOAD_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingDownload;
  } catch {
    return null;
  }
}

export async function clearPendingDownload(): Promise<void> {
  await removeItem(PENDING_DOWNLOAD_KEY);
}

/**
 * Estimate available device storage.
 *
 * Steps:
 *  1. Call Filesystem.getUri on the downloads directory to confirm the
 *     filesystem is accessible (or at least that the API is present).
 *  2. Use navigator.storage.estimate() to get quota/usage figures.
 *
 * Returns free bytes, or Infinity when the estimate is unavailable so the
 * caller can proceed optimistically rather than blocking the user.
 */
async function getFreeSpaceBytes(): Promise<number> {
  // Step 1 — confirm filesystem access via Filesystem.getUri.
  // The directory may not exist yet (first download) — that's fine.
  try {
    await Filesystem.getUri({ path: 'audio-downloads', directory: Directory.Data });
  } catch {
    // Not an error: the path just hasn't been created yet.
  }

  // Step 2 — StorageManager estimate.
  if (navigator.storage?.estimate) {
    try {
      const { quota = 0, usage = 0 } = await navigator.storage.estimate();
      if (quota > 0) return quota - usage;
    } catch {
      // estimate() unavailable or threw — fall through.
    }
  }

  // Can't determine free space; proceed optimistically.
  return Infinity;
}

let cancelFlag = false;

export async function downloadSurah(
  reciterId: string,
  surahNum: number,
  _totalVerses: number,
  onProgress?: (percent: number) => void,
  onStorageError?: (message: string) => void
): Promise<void> {
  const reciter = getReciterById(reciterId);
  if (!reciter) {
    console.error('[DownloadManager] Unknown reciter:', reciterId);
    return;
  }

  cancelFlag = false;

  if (isFullChapterDownloaded(reciterId, surahNum)) {
    onProgress?.(100);
    return;
  }

  // ── Pre-flight free-space check ───────────────────────────────────────────
  const freeBytes = await getFreeSpaceBytes();
  if (freeBytes < MIN_FREE_BYTES) {
    console.warn(`[DownloadManager] Insufficient storage: ${Math.round(freeBytes / 1024 / 1024)} MB free`);
    onStorageError?.(STORAGE_ERROR_MSG);
    return;
  }

  const quranComId = getQuranComReciterId(reciterId);
  const chapterUrl = getChapterAudioUrl(quranComId, surahNum);
  if (!chapterUrl) {
    console.error('[DownloadManager] No chapter audio URL for reciter:', reciterId);
    return;
  }

  if (cancelFlag) return;

  let success = false;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (cancelFlag) return;
      success = await saveFullChapterAudio(reciterId, surahNum, chapterUrl, (p) => {
        onProgress?.(Math.round(p * 0.9));
      });
      if (success) break;
      if (attempt === 0) {
        console.warn(`[DownloadManager] Retry full chapter ${surahNum}`);
        await new Promise(r => setTimeout(r, 500));
      }
    }
  } catch (err) {
    if (err instanceof StorageQuotaError) {
      // Mid-download write failed: disk filled up while saving.
      cancelFlag = true;
      abortActiveDownload();
      console.warn(`[DownloadManager] Storage quota exceeded writing chapter ${surahNum}`);
      onStorageError?.(STORAGE_ERROR_MSG);
      return;
    }
    throw err;
  }

  if (!success) {
    console.error(`[DownloadManager] Failed to download chapter ${surahNum} after 2 attempts`);
    return;
  }

  if (cancelFlag) return;

  onProgress?.(92);

  let timingSaved = false;
  try {
    const timingUrl = getTimingUrl(quranComId, surahNum);
    const timingResponse = await fetch(timingUrl);
    if (timingResponse.ok) {
      const rawData = await timingResponse.json();
      const timingData = normalizeTimingResponse(rawData);
      await saveOfflineTimingData(reciterId, surahNum, timingData);
      timingSaved = true;
    }
  } catch (err) {
    console.warn('[DownloadManager] Failed to cache timing data:', err);
  }

  if (!timingSaved) {
    console.error(`[DownloadManager] Timing data missing for chapter ${surahNum}, removing audio`);
    try {
      await Filesystem.deleteFile({
        path: `audio-downloads/${reciterId}/chapter_${surahNum}.mp3`,
        directory: Directory.Data,
      });
    } catch {}
    removeManifestEntry(chapterFileKey(reciterId, surahNum));
    await saveManifest();
    return;
  }

  onProgress?.(100);
}

export async function downloadAllSurahs(
  reciterId: string,
  onProgress?: (surahNum: number, percent: number) => void,
  onStorageError?: (message: string) => void
): Promise<void> {
  cancelFlag = false;

  for (const chapter of chapters) {
    if (cancelFlag) {
      console.log('[DownloadManager] Bulk download cancelled');
      return;
    }

    await downloadSurah(
      reciterId,
      chapter.id,
      chapter.verseCount,
      (percent) => onProgress?.(chapter.id, percent),
      onStorageError
    );
  }
}

export function cancelDownload(): void {
  cancelFlag = true;
  abortActiveDownload();
}

export async function deleteSurahDownload(
  reciterId: string,
  surahNum: number,
  totalVerses: number
): Promise<void> {
  const manifest = getManifest();
  if (!manifest) return;

  const chapKey = chapterFileKey(reciterId, surahNum);
  const chapEntry = manifest.files[chapKey];
  if (chapEntry && chapEntry.source === 'download') {
    try {
      await Filesystem.deleteFile({
        path: chapEntry.filePath,
        directory: Directory.Data,
      });
    } catch (err) {
      console.error(`[DownloadManager] Failed to delete ${chapEntry.filePath}:`, err);
    }
    removeManifestEntry(chapKey);
  }

  for (let v = 1; v <= totalVerses; v++) {
    const key = fileKey(reciterId, surahNum, v);
    const entry = manifest.files[key];
    if (!entry || entry.source !== 'download') continue;

    try {
      await Filesystem.deleteFile({
        path: entry.filePath,
        directory: Directory.Data,
      });
    } catch (err) {
      console.error(`[DownloadManager] Failed to delete ${entry.filePath}:`, err);
    }
    removeManifestEntry(key);
  }

  try {
    await Filesystem.deleteFile({
      path: `audio-downloads/${reciterId}/timing_${surahNum}.json`,
      directory: Directory.Data,
    });
  } catch {
  }

  await saveManifest();
}

export async function deleteReciterDownloads(reciterId: string): Promise<void> {
  const manifest = getManifest();
  if (!manifest) return;

  const keysToDelete = Object.entries(manifest.files)
    .filter(([, entry]) => entry.reciterId === reciterId && entry.source === 'download')
    .map(([key]) => key);

  const surahsToClean = new Set<number>();
  for (const key of keysToDelete) {
    const entry = manifest.files[key];
    if (!entry) continue;
    surahsToClean.add(entry.surahNumber);
    try {
      await Filesystem.deleteFile({
        path: entry.filePath,
        directory: Directory.Data,
      });
    } catch (err) {
      console.error(`[DownloadManager] Failed to delete ${entry.filePath}:`, err);
    }
    removeManifestEntry(key);
  }

  for (const surahNum of Array.from(surahsToClean)) {
    try {
      await Filesystem.deleteFile({
        path: `audio-downloads/${reciterId}/timing_${surahNum}.json`,
        directory: Directory.Data,
      });
    } catch {
    }
  }

  await saveManifest();
}

export function getDownloadStatus(
  reciterId: string,
  surahNum: number,
  totalVerses: number
): 'none' | 'partial' | 'complete' {
  if (isFullChapterDownloaded(reciterId, surahNum)) return 'complete';

  const manifest = getManifest();
  if (!manifest) return 'none';

  let downloadedCount = 0;
  for (let v = 1; v <= totalVerses; v++) {
    const key = fileKey(reciterId, surahNum, v);
    const entry = manifest.files[key];
    if (entry && entry.source === 'download') {
      downloadedCount++;
    }
  }

  if (downloadedCount === 0) return 'none';
  if (downloadedCount >= totalVerses) return 'complete';
  return 'partial';
}
