import { Capacitor } from '@capacitor/core';
import { API_BASE_URL } from '@/config';

const QURAN_CDN_API = 'https://api.qurancdn.com';
const EVERYAYAH_CDN = 'https://everyayah.com';

export function getTimingUrl(reciterId: number, chapterId: number): string {
  if (Capacitor.isNativePlatform()) {
    return `${QURAN_CDN_API}/api/qdc/audio/reciters/${reciterId}/audio_files?chapter=${chapterId}&segments=true`;
  }
  return `${API_BASE_URL}/api/audio-timing/${reciterId}/${chapterId}`;
}

export function getVerseAudioUrl(everyAyahFolder: string, surahNum: number, verseNum: number): string {
  const surah = String(surahNum).padStart(3, '0');
  const ayah = String(verseNum).padStart(3, '0');
  if (Capacitor.isNativePlatform()) {
    return `${EVERYAYAH_CDN}/data/${everyAyahFolder}/${surah}${ayah}.mp3`;
  }
  return `${API_BASE_URL}/api/verse-audio/${everyAyahFolder}/${surah}/${ayah}`;
}

export interface NormalizedTimingResponse {
  audio_files: any[];
}

export function normalizeTimingResponse(data: any): NormalizedTimingResponse {
  if (data.audio_files && Array.isArray(data.audio_files)) {
    return { audio_files: data.audio_files };
  }
  if (data.audio_file && typeof data.audio_file === 'object') {
    return { audio_files: [data.audio_file] };
  }
  throw new Error('Unexpected timing API response format');
}
