export interface VerseTimestamp {
  verse: number;
  start: number;
  end: number;
}

// Verse timestamps for Al-Fatihah (Mishary Rashid Alafasy)
// Updated for actual Alafasy CDN recitation timing
export const alFatihahTimestamps: VerseTimestamp[] = [
  { verse: 1, start: 0, end: 7 },
  { verse: 2, start: 7, end: 14 },
  { verse: 3, start: 14, end: 18 },
  { verse: 4, start: 18, end: 23 },
  { verse: 5, start: 23, end: 30 },
  { verse: 6, start: 30, end: 38 },
  { verse: 7, start: 38, end: 51 },
];

// Real Quran recitation audio proxied through our backend
export const getChapterAudioUrl = (chapterId: number, reciter: string = 'Alafasy') => {
  // Map reciter names to CDN identifiers
  const reciterMap: { [key: string]: string } = {
    'Alafasy': 'ar.alafasy',
    'Sudais': 'ar.abdurrahmaansudais',
    'Ghamadi': 'ar.shaatree',
  };
  
  const reciterId = reciterMap[reciter] || 'ar.alafasy';
  
  // Use our backend proxy to avoid CORS issues
  // Backend fetches from: https://cdn.islamic.network/quran/audio-surah/128/{reciter}/{chapter}.mp3
  return `/api/audio/${reciterId}/${chapterId}`;
};

export const getVerseTimestamps = (chapterId: number): VerseTimestamp[] => {
  if (chapterId === 1) {
    return alFatihahTimestamps;
  }
  
  // For other chapters, generate approximate timestamps
  // In production, use actual verse timing data
  const verseCount = getVerseCount(chapterId);
  const avgVerseDuration = 8; // seconds per verse (approximate)
  
  return Array.from({ length: verseCount }, (_, i) => ({
    verse: i + 1,
    start: i * avgVerseDuration,
    end: (i + 1) * avgVerseDuration,
  }));
};

function getVerseCount(chapterId: number): number {
  const verseCounts: { [key: number]: number } = {
    1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206,
  };
  return verseCounts[chapterId] || 10;
}
