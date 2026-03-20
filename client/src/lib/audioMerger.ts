import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import type { WordSegment, AudioFile, TimingData } from '@/hooks/useWordTimingAudio';
import {
  getOfflineTimingData,
} from '@/services/audioCache';
import { fileKey, getManifest } from '@/services/audioCache';

export interface MergedAudioResult {
  blobUrl: string;
  audioFile: AudioFile;
}

function createAudioContext(): AudioContext {
  const Ctor = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) throw new Error('AudioContext not supported');
  return new Ctor();
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

function writeWavHeader(view: DataView, sampleRate: number, numChannels: number, totalSamples: number): void {
  const bytesPerSample = 2;
  const dataSize = totalSamples * numChannels * bytesPerSample;

  function writeStr(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
}

function encodePcmChunk(decoded: AudioBuffer, numChannels: number): ArrayBuffer {
  const bytesPerSample = 2;
  const samples = decoded.length;
  const chunkSize = samples * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(chunkSize);
  const view = new DataView(buffer);
  let offset = 0;

  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const src = decoded.getChannelData(Math.min(ch, decoded.numberOfChannels - 1));
      const sample = Math.max(-1, Math.min(1, src[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return buffer;
}

export async function mergeDownloadedAudio(
  reciterId: string,
  chapterId: number,
  verseNumbers: number[]
): Promise<MergedAudioResult | null> {
  const sortedVerses = [...verseNumbers].sort((a, b) => a - b);
  const audioCtx = createAudioContext();

  try {
    const offlineTiming = await getOfflineTimingData(reciterId, chapterId) as TimingData | null;
    const originalTimings = offlineTiming?.audio_files?.[0]?.verse_timings ?? [];

    const wavParts: ArrayBuffer[] = [];
    const verseTimings: WordSegment[] = [];
    let totalSamples = 0;
    let sampleRate = 0;
    let numChannels = 0;
    let sampleOffset = 0;

    for (const verseNum of sortedVerses) {
      const arrayBuffer = await readVerseAsArrayBuffer(reciterId, chapterId, verseNum);
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        return null;
      }

      let decoded: AudioBuffer;
      try {
        decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      } catch {
        return null;
      }

      if (sampleRate === 0) {
        sampleRate = decoded.sampleRate;
        numChannels = decoded.numberOfChannels;
      } else {
        numChannels = Math.max(numChannels, decoded.numberOfChannels);
      }

      totalSamples += decoded.length;

      const pcmChunk = encodePcmChunk(decoded, numChannels);
      wavParts.push(pcmChunk);

      const timestampFromMs = (sampleOffset / sampleRate) * 1000;
      const verseDurationMs = (decoded.length / sampleRate) * 1000;
      const timestampToMs = timestampFromMs + verseDurationMs;
      const verseKey = `${chapterId}:${verseNum}`;

      const originalTiming = originalTimings.find(t => t.verse_key === verseKey);
      let segments: [number, number, number][] = [];

      if (originalTiming?.segments && originalTiming.segments.length > 0) {
        const origStart = originalTiming.timestamp_from;
        const origDuration = originalTiming.timestamp_to - origStart;
        const scale = origDuration > 0 ? verseDurationMs / origDuration : 1;

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

      sampleOffset += decoded.length;
    }

    if (wavParts.length === 0 || sampleRate === 0) return null;

    const headerBuffer = new ArrayBuffer(44);
    writeWavHeader(new DataView(headerBuffer), sampleRate, numChannels, totalSamples);

    const blobParts: BlobPart[] = [headerBuffer, ...wavParts];
    const wavBlob = new Blob(blobParts, { type: 'audio/wav' });
    const blobUrl = URL.createObjectURL(wavBlob);

    const audioFile: AudioFile = {
      id: 0,
      chapter_id: chapterId,
      file_size: wavBlob.size,
      format: 'wav',
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
