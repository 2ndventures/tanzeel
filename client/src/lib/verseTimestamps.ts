export interface VerseTimestamp {
  verse: number;
  start: number;
  end: number;
}

// Verse timestamps for Al-Fatihah (Mishary Rashid Alafasy)
// These are approximate timings - in production, use accurate timestamps
export const alFatihahTimestamps: VerseTimestamp[] = [
  { verse: 1, start: 0, end: 6.5 },
  { verse: 2, start: 6.5, end: 12.8 },
  { verse: 3, start: 12.8, end: 17.2 },
  { verse: 4, start: 17.2, end: 21.5 },
  { verse: 5, start: 21.5, end: 27.8 },
  { verse: 6, start: 27.8, end: 32.5 },
  { verse: 7, start: 32.5, end: 42.0 },
];

// For demo purposes - mock audio URL
// In production, use actual Quran recitation URLs
export const getChapterAudioUrl = (chapterId: number, reciter: string = 'alafasy') => {
  // This would normally point to a real audio file
  // For demo, we'll use a placeholder that returns a valid audio URL
  const reciterPaths: { [key: string]: string } = {
    'Alafasy': 'alafasy',
    'Sudais': 'sudais',
    'Ghamadi': 'ghamadi',
  };
  
  const reciterPath = reciterPaths[reciter] || 'alafasy';
  
  // Using a public domain audio file for demo
  // In production, replace with actual Quran audio CDN
  return `https://cdn.islamic.network/quran/audio-surah/128/${reciterPath}/${chapterId}.mp3`;
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
