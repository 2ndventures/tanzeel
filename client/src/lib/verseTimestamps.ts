export interface VerseTimestamp {
  verse: number;
  start: number;
  end: number;
}

// Verse timestamps for Al-Fatihah (Mishary Rashid Alafasy)
// Fine-tuned timing to match actual Alafasy CDN recitation
export const alFatihahTimestamps: VerseTimestamp[] = [
  { verse: 1, start: 0, end: 5.5 },      // Bismillaahir Rahmaanir Raheem
  { verse: 2, start: 5.5, end: 11 },     // Alhamdu lillaahi Rabbil 'aalameen
  { verse: 3, start: 11, end: 14.5 },    // Ar-Rahmaanir-Raheem
  { verse: 4, start: 14.5, end: 19 },    // Maaliki Yawmid-Deen
  { verse: 5, start: 19, end: 25.5 },    // Iyyaaka na'budu wa iyyaaka nasta'een
  { verse: 6, start: 25.5, end: 33 },    // Ihdinas-Siraatal-Mustaqeem
  { verse: 7, start: 33, end: 52 },      // Siraatal-lazeena an'amta 'alaihim... (extends to end of audio)
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
