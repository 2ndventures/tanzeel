export interface VerseTimestamp {
  verse: number;
  start: number;
  end: number;
}

// Verse timestamps for Al-Fatihah (Mishary Rashid Alafasy)
// Audio includes preamble (~6s) before Bismillah (verse 1)
export const alFatihahTimestamps: VerseTimestamp[] = [
  { verse: 1, start: 6, end: 11.5 },     // Bismillaahir Rahmaanir Raheem
  { verse: 2, start: 11.5, end: 17 },    // Alhamdu lillaahi Rabbil 'aalameen
  { verse: 3, start: 17, end: 20.5 },    // Ar-Rahmaanir-Raheem
  { verse: 4, start: 20.5, end: 25 },    // Maaliki Yawmid-Deen
  { verse: 5, start: 25, end: 31.5 },    // Iyyaaka na'budu wa iyyaaka nasta'een
  { verse: 6, start: 31.5, end: 39 },    // Ihdinas-Siraatal-Mustaqeem
  { verse: 7, start: 39, end: 58 },      // Siraatal-lazeena an'amta 'alaihim... (extends to end of audio)
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
  
  // For chapters 2+, audio includes Bismillah preamble (~3 seconds) before verse 1
  // Chapter 9 (At-Tawbah) does NOT have Bismillah, so no offset
  const preambleOffset = chapterId === 9 ? 0 : 3;
  
  // For other chapters, generate approximate timestamps
  // In production, use actual verse timing data
  const verseCount = getVerseCount(chapterId);
  const avgVerseDuration = 8; // seconds per verse (approximate)
  
  return Array.from({ length: verseCount }, (_, i) => ({
    verse: i + 1,
    start: preambleOffset + (i * avgVerseDuration),
    end: preambleOffset + ((i + 1) * avgVerseDuration),
  }));
};

function getVerseCount(chapterId: number): number {
  const verseCounts: { [key: number]: number } = {
    1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206,
  };
  return verseCounts[chapterId] || 10;
}
