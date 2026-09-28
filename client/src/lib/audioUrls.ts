import { Capacitor } from '@capacitor/core';
import { API_BASE_URL } from '@/config';

const QURAN_CDN_API = 'https://api.qurancdn.com';
const QURAN_AUDIO_CDN = 'https://download.quranicaudio.com';
const EVERYAYAH_CDN = 'https://everyayah.com';

interface CdnReciterInfo {
  path: string;
  zeroPadChapter: boolean;
}

const QURAN_COM_ID_TO_CDN: Record<number, CdnReciterInfo> = {
  1: { path: 'qdc/abdul_baset/mujawwad', zeroPadChapter: false },
  2: { path: 'qdc/abdul_baset/murattal', zeroPadChapter: false },
  3: { path: 'qdc/khalil_al_husary/muallim', zeroPadChapter: false },
  5: { path: 'quran/abdul_muhsin_alqasim', zeroPadChapter: true },
  7: { path: 'qdc/mishari_al_afasy/murattal', zeroPadChapter: false },
  9: { path: 'qdc/siddiq_minshawi/murattal', zeroPadChapter: false },
  11: { path: 'qdc/abdurrahmaan_as_sudais/murattal', zeroPadChapter: false },
  12: { path: 'qdc/abdul_baset/murattal', zeroPadChapter: false },
};

export function getTimingUrl(reciterId: number, chapterId: number): string {
  if (Capacitor.isNativePlatform()) {
    return `${QURAN_CDN_API}/api/qdc/audio/reciters/${reciterId}/audio_files?chapter=${chapterId}&segments=true`;
  }
  return `${API_BASE_URL}/api/audio-timing/${reciterId}/${chapterId}`;
}

export function getChapterAudioUrl(reciterId: number, chapterId: number): string | null {
  const info = QURAN_COM_ID_TO_CDN[reciterId];
  if (!info) return null;
  const chapter = info.zeroPadChapter
    ? String(chapterId).padStart(3, '0')
    : String(chapterId);
  return `${QURAN_AUDIO_CDN}/${info.path}/${chapter}.mp3`;
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
