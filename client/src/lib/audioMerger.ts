import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import type { WordSegment, AudioFile, TimingData } from '@/hooks/useWordTimingAudio';
import {
  getOfflineTimingData,
} from '@/services/audioCache';
import { fileKey, getManifest } from '@/services/audioCache';

const MAX_MERGE_VERSES = 200;

export interface MergedAudioResult {
  blobUrl: string;
  audioFile: AudioFile;
}

async function readVerseAsArrayBuffer(
  reciterId: string,
  surahNum: number,
  verseNum: number
): Promise<ArrayBuffer | null> {
  const manifest = getManifest();
  if (!manifest) return null;
  const key = fileKey(reciterId, surahNum, verseNum);
  const entry = manifest.files[key];
  if (!entry) return null;

  const dir = entry.source === 'download' ? Directory.Data : Directory.Cache;

  try {
    if (Capacitor.isNativePlatform()) {
      const uriResult = await Filesystem.getUri({
        path: entry.filePath,
        directory: dir,
      });
      const src = Capacitor.convertFileSrc(uriResult.uri);
      const response = await fetch(src);
      return await response.arrayBuffer();
    }

    const fileResult = await Filesystem.readFile({
      path: entry.filePath,
      directory: dir,
    });
    const base64String = fileResult.data as string;
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch {
    return null;
  }
}

export async function mergeDownloadedAudio(
  reciterId: string,
  chapterId: number,
  verseNumbers: number[]
): Promise<MergedAudioResult | null> {
  const sortedVerses = [...verseNumbers].sort((a, b) => a - b);

  if (sortedVerses.length > MAX_MERGE_VERSES) {
    return null;
  }

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

  try {
    const verseParts: { verseNum: number; buffer: ArrayBuffer; durationMs: number }[] = [];

    for (const verseNum of sortedVerses) {
      const arrayBuffer = await readVerseAsArrayBuffer(reciterId, chapterId, verseNum);
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        return null;
      }
      let durationSec: number;
      try {
        const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        durationSec = decoded.duration;
      } catch {
        return null;
      }
      if (durationSec <= 0) {
        return null;
      }
      verseParts.push({
        verseNum,
        buffer: arrayBuffer,
        durationMs: durationSec * 1000,
      });
    }

    if (verseParts.length === 0) return null;

    const blobParts = verseParts.map(v => new Uint8Array(v.buffer));
    const mergedBlob = new Blob(blobParts, { type: 'audio/mpeg' });
    const blobUrl = URL.createObjectURL(mergedBlob);

    const offlineTiming = await getOfflineTimingData(reciterId, chapterId) as TimingData | null;
    const originalTimings = offlineTiming?.audio_files?.[0]?.verse_timings ?? [];

    const verseTimings: WordSegment[] = [];
    let cumulativeMs = 0;

    for (const { verseNum, durationMs } of verseParts) {
      const timestampFromMs = cumulativeMs;
      const timestampToMs = cumulativeMs + durationMs;
      const verseKey = `${chapterId}:${verseNum}`;

      const originalTiming = originalTimings.find(t => t.verse_key === verseKey);
      let segments: [number, number, number][] = [];

      if (originalTiming?.segments && originalTiming.segments.length > 0) {
        const origStart = originalTiming.timestamp_from;
        const origDuration = originalTiming.timestamp_to - origStart;
        const scale = origDuration > 0 ? durationMs / origDuration : 1;

        segments = originalTiming.segments.map(seg => {
          const wordIdx = seg[0];
          const wordStart = timestampFromMs + (seg[1] - origStart) * scale;
          const wordEnd = timestampFromMs + (seg[2] - origStart) * scale;
          return [wordIdx, Math.round(wordStart), Math.round(wordEnd)] as [number, number, number];
        });
      }

      verseTimings.push({
        verse_key: verseKey,
        timestamp_from: Math.round(timestampFromMs),
        timestamp_to: Math.round(timestampToMs),
        segments,
      });

      cumulativeMs += durationMs;
    }

    const audioFile: AudioFile = {
      id: 0,
      chapter_id: chapterId,
      file_size: mergedBlob.size,
      format: 'mp3',
      audio_url: blobUrl,
      verse_timings: verseTimings,
    };

    return { blobUrl, audioFile };
  } catch (err) {
    console.error('[AudioMerger] Failed to merge audio:', err);
    return null;
  } finally {
    audioCtx.close();
  }
}
