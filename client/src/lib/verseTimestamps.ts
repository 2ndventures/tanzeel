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

// Store created blob URLs for cleanup
const audioBlobCache = new Map<string, string>();

// For demo purposes - mock audio URL
// In production, use actual Quran recitation URLs
export const getChapterAudioUrl = (chapterId: number, reciter: string = 'alafasy') => {
  // For demo purposes, we use a minimal WAV file
  // In production, this would point to actual Quran recitation CDN
  
  const cacheKey = `${chapterId}-${reciter}`;
  
  // Return cached URL if exists
  if (audioBlobCache.has(cacheKey)) {
    return audioBlobCache.get(cacheKey)!;
  }
  
  // Get verse timestamps for this chapter to determine audio duration
  const timestamps = getVerseTimestamps(chapterId);
  const duration = Math.ceil(timestamps[timestamps.length - 1]?.end || 60) + 2; // Add 2s buffer
  
  // Minimal silent WAV at 8kHz (smaller, loads faster)
  const sampleRate = 8000;
  const numSamples = sampleRate * duration;
  
  // Pre-compute WAV file size
  const dataSize = numSamples * 2;
  const fileSize = 44 + dataSize;
  
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  
  // WAV header (optimized)
  const writeStr = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
  };
  
  writeStr(0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);          // fmt chunk size
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sampleRate, true);  // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);           // block align
  view.setUint16(34, 16, true);          // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Silent samples (already 0 from ArrayBuffer)
  
  const blobUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  audioBlobCache.set(cacheKey, blobUrl);
  
  return blobUrl;
};

// Cleanup function to revoke blob URLs when needed
export const revokeChapterAudioUrl = (chapterId: number, reciter: string = 'alafasy') => {
  const cacheKey = `${chapterId}-${reciter}`;
  const url = audioBlobCache.get(cacheKey);
  if (url) {
    URL.revokeObjectURL(url);
    audioBlobCache.delete(cacheKey);
  }
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
