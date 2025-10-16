export interface VerseTimestamp {
  verse: number;
  start: number;
  end: number;
}

// Preamble text recited before chapters
export const PREAMBLE_TEXT = {
  arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
  transliteration: "A'udhu billahi min ash-shaytan ir-rajim",
  translation: "I seek refuge with Allah from Satan, the expelled",
};

// Verse timestamps for Al-Fatihah (Mishary Rashid Alafasy)
// Includes preamble as verse 0
export const alFatihahTimestamps: VerseTimestamp[] = [
  { verse: 0, start: 0, end: 6 },        // A'udhu billahi (preamble)
  { verse: 1, start: 6, end: 11.5 },     // Bismillaahir Rahmaanir Raheem
  { verse: 2, start: 11.5, end: 17 },    // Alhamdu lillaahi Rabbil 'aalameen
  { verse: 3, start: 17, end: 20.5 },    // Ar-Rahmaanir-Raheem
  { verse: 4, start: 20.5, end: 25 },    // Maaliki Yawmid-Deen
  { verse: 5, start: 25, end: 31.5 },    // Iyyaaka na'budu wa iyyaaka nasta'een
  { verse: 6, start: 31.5, end: 39 },    // Ihdinas-Siraatal-Mustaqeem
  { verse: 7, start: 39, end: 58 },      // Siraatal-lazeena an'amta 'alaihim... (extends to end of audio)
];

// Real Quran recitation audio proxied through our backend
export const getChapterAudioUrl = (chapterId: number, reciter: string = 'ar.alafasy') => {
  // Reciter parameter is now already an API identifier (e.g., "ar.alafasy")
  // Validate it has correct format, otherwise use default
  const isValidReciterId = /^(ar|en|fa|ur|zh|fr|ru)\..+/.test(reciter);
  const reciterId = isValidReciterId ? reciter : 'ar.alafasy';
  
  // Use our backend proxy to avoid CORS issues
  // Backend fetches from: https://cdn.islamic.network/quran/audio-surah/128/{reciter}/{chapter}.mp3
  return `/api/audio/${reciterId}/${chapterId}`;
};

// Fetch reciter-specific timestamps from MP3Quran.net API
export const fetchVerseTimestamps = async (
  chapterId: number,
  reciterId: number
): Promise<VerseTimestamp[]> => {
  try {
    const response = await fetch(
      `https://www.mp3quran.net/api/v3/ayat_timing?surah=${chapterId}&read=${reciterId}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch timestamps: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Convert MP3Quran format to our format
    // MP3Quran uses milliseconds, we use seconds
    return data.map((item: any) => ({
      verse: item.ayah, // 0 for preamble, 1+ for verses
      start: item.start_time / 1000, // Convert ms to seconds
      end: item.end_time / 1000,
    }));
  } catch (error) {
    console.error('Failed to fetch verse timestamps:', error);
    // Return fallback timestamps
    return getApproximateTimestamps(chapterId);
  }
};

// Fallback: Generate approximate timestamps
export const getApproximateTimestamps = (chapterId: number): VerseTimestamp[] => {
  const verseCount = getVerseCount(chapterId);
  const avgVerseDuration = 8; // seconds per verse (approximate)
  
  // Chapter 9 (At-Tawbah) does NOT have Bismillah preamble
  const hasPreamble = chapterId !== 9;
  const preambleDuration = hasPreamble ? 3 : 0;
  
  const timestamps: VerseTimestamp[] = [];
  
  // Add preamble (A'udhu billahi) for chapters that have it
  if (hasPreamble) {
    timestamps.push({ verse: 0, start: 0, end: preambleDuration });
  }
  
  // Add verse timestamps
  for (let i = 0; i < verseCount; i++) {
    timestamps.push({
      verse: i + 1,
      start: preambleDuration + (i * avgVerseDuration),
      end: preambleDuration + ((i + 1) * avgVerseDuration),
    });
  }
  
  return timestamps;
};

// For backward compatibility and static usage
export const getVerseTimestamps = (chapterId: number): VerseTimestamp[] => {
  if (chapterId === 1) {
    return alFatihahTimestamps;
  }
  
  return getApproximateTimestamps(chapterId);
};

function getVerseCount(chapterId: number): number {
  const verseCounts: { [key: number]: number } = {
    1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206,
  };
  return verseCounts[chapterId] || 10;
}
