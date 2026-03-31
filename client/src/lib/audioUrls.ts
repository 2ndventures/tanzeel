import { Capacitor } from '@capacitor/core';
import { API_BASE_URL } from '@/config';

const QURAN_CDN_API = 'https://api.qurancdn.com';
const QURAN_AUDIO_CDN = 'https://download.quranicaudio.com';
const EVERYAYAH_CDN = 'https://everyayah.com';

const QURAN_COM_ID_TO_CDN_SLUG: Record<number, string> = {
  7: 'mishari_al_afasy',
};

export function getTimingUrl(reciterId: number, chapterId: number): string {
  if (Capacitor.isNativePlatform()) {
    return `${QURAN_CDN_API}/api/qdc/audio/reciters/${reciterId}/audio_files?chapter=${chapterId}&segments=true`;
  }
  return `${API_BASE_URL}/api/audio-timing/${reciterId}/${chapterId}`;
}

export function getChapterAudioUrl(reciterId: number, chapterId: number): string | null {
  const slug = QURAN_COM_ID_TO_CDN_SLUG[reciterId];
  if (!slug) return null;
  return `${QURAN_AUDIO_CDN}/qdc/${slug}/murattal/${chapterId}.mp3`;
}

export function getVerseAudioUrl(everyAyahFolder: string, surahNum: number, verseNum: number): string {
  const surah = String(surahNum).padStart(3, '0');
  const ayah = String(verseNum).padStart(3, '0');
  if (Capacitor.isNativePlatform()) {
    return `${EVERYAYAH_CDN}/data/${everyAyahFolder}/${surah}${ayah}.mp3`;
  }
  return `${API_BASE_URL}/api/verse-audio/${everyAyahFolder}/${surah}/${ayah}`;
}

export interface AudioFileData {
  id: number;
  chapter_id: number;
  file_size: number;
  format: string;
  audio_url: string;
  verse_timings: {
    timestamp_from: number;
    timestamp_to: number;
    segments: [number, number, number][];
    verse_key: string;
  }[];
}

export interface NormalizedTimingResponse {
  audio_files: AudioFileData[];
}

export function normalizeTimingResponse(data: Record<string, unknown>): NormalizedTimingResponse {
  if (data.audio_files && Array.isArray(data.audio_files)) {
    return { audio_files: data.audio_files as AudioFileData[] };
  }
  if (data.audio_file && typeof data.audio_file === 'object') {
    return { audio_files: [data.audio_file as AudioFileData] };
  }
  throw new Error('Unexpected timing API response format');
}
