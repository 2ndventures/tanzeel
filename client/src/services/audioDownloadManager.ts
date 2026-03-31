import { Filesystem, Directory } from '@capacitor/filesystem';
import { getReciterById, getQuranComReciterId } from '@/lib/reciters';
import {
  fileKey,
  getManifest,
  removeManifestEntry,
  saveManifest,
  cacheAudioFile,
  isVerseCached,
  saveOfflineTimingData,
} from '@/services/audioCache';
import { chapters } from '@/lib/quranMetadata';
import { setItem, getItem, removeItem } from '@/lib/storage';
import { getTimingUrl, getVerseAudioUrl, normalizeTimingResponse } from '@/lib/audioUrls';

const PENDING_DOWNLOAD_KEY = 'pendingDownload';

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

let cancelFlag = false;

function buildAudioUrl(everyAyahFolder: string, surahNum: number, verseNum: number): string {
  return getVerseAudioUrl(everyAyahFolder, surahNum, verseNum);
}

export async function downloadSurah(
  reciterId: string,
  surahNum: number,
  totalVerses: number,
  onProgress?: (percent: number) => void
): Promise<void> {
  const reciter = getReciterById(reciterId);
  if (!reciter) {
    console.error('[DownloadManager] Unknown reciter:', reciterId);
    return;
  }

  cancelFlag = false;
  let completed = 0;

  for (let v = 1; v <= totalVerses; v++) {
    if (cancelFlag) {
      console.log('[DownloadManager] Download cancelled');
      return;
    }

    if (isVerseCached(reciterId, surahNum, v)) {
      const manifest = getManifest();
      const key = fileKey(reciterId, surahNum, v);
      const entry = manifest?.files[key];
      if (entry && entry.source === 'download') {
        completed++;
        onProgress?.(Math.round((completed / totalVerses) * 100));
        continue;
      }
    }

    const url = buildAudioUrl(reciter.everyAyahFolder, surahNum, v);
    let success = false;

    for (let attempt = 0; attempt < 2; attempt++) {
      success = await cacheAudioFile(reciterId, surahNum, v, url, 'download');
      if (success) break;
      if (attempt === 0) {
        console.warn(`[DownloadManager] Retry verse ${surahNum}:${v}`);
        await new Promise(r => setTimeout(r, 500));
      }
    }

    if (!success) {
      console.error(`[DownloadManager] Failed to download verse ${surahNum}:${v} after 2 attempts`);
    }

    completed++;
    onProgress?.(Math.round((completed / totalVerses) * 100));
  }

  try {
    const quranComId = getQuranComReciterId(reciterId);
    const timingUrl = getTimingUrl(quranComId, surahNum);
    const timingResponse = await fetch(timingUrl);
    if (timingResponse.ok) {
      const rawData = await timingResponse.json();
      const timingData = normalizeTimingResponse(rawData);
      await saveOfflineTimingData(reciterId, surahNum, timingData);
    }
  } catch (err) {
    console.warn('[DownloadManager] Failed to cache timing data:', err);
  }
}

export async function downloadAllSurahs(
  reciterId: string,
  onProgress?: (surahNum: number, percent: number) => void
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
      (percent) => onProgress?.(chapter.id, percent)
    );
  }
}

export function cancelDownload(): void {
  cancelFlag = true;
}

export async function deleteSurahDownload(
  reciterId: string,
  surahNum: number,
  totalVerses: number
): Promise<void> {
  const manifest = getManifest();
  if (!manifest) return;

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

  for (const surahNum of surahsToClean) {
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
