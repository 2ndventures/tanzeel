export interface Chapter {
  id: number;
  arabicName: string;
  englishName: string;
  verseCount: number;
  revelationType: string;
}

export interface Verse {
  number: number;
  arabicText: string;
  transliteration: string;
  translation: string;
}

export const chapters: Chapter[] = [
  { id: 1, arabicName: "Al-Fatihah", englishName: "The Opener", verseCount: 7, revelationType: "Meccan" },
  { id: 2, arabicName: "Al-Baqarah", englishName: "The Cow", verseCount: 286, revelationType: "Medinan" },
  { id: 3, arabicName: "Ali 'Imran", englishName: "Family of Imran", verseCount: 200, revelationType: "Medinan" },
  { id: 4, arabicName: "An-Nisa", englishName: "The Women", verseCount: 176, revelationType: "Medinan" },
  { id: 5, arabicName: "Al-Ma'idah", englishName: "The Table Spread", verseCount: 120, revelationType: "Medinan" },
  { id: 6, arabicName: "Al-An'am", englishName: "The Cattle", verseCount: 165, revelationType: "Meccan" },
  { id: 7, arabicName: "Al-A'raf", englishName: "The Heights", verseCount: 206, revelationType: "Meccan" },
];

export const alFatihahVerses: Verse[] = [
  {
    number: 1,
    arabicText: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    transliteration: "Bismillaahir Rahmaanir Raheem",
    translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
  },
  {
    number: 2,
    arabicText: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ",
    transliteration: "Alhamdu lillaahi Rabbil 'aalameen",
    translation: "All praise is due to Allah, Lord of the worlds.",
  },
  {
    number: 3,
    arabicText: "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
    transliteration: "Ar-Rahmaanir-Raheem",
    translation: "The Entirely Merciful, the Especially Merciful.",
  },
  {
    number: 4,
    arabicText: "مَٰلِكِ يَوْمِ ٱلدِّينِ",
    transliteration: "Maaliki Yawmid-Deen",
    translation: "Sovereign of the Day of Recompense.",
  },
  {
    number: 5,
    arabicText: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
    transliteration: "Iyyaaka na'budu wa lyyaaka nasta'een",
    translation: "It is You we worship and You we ask for help.",
  },
  {
    number: 6,
    arabicText: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ",
    transliteration: "Ihdinas-Siraatal-Mustaqeem",
    translation: "Guide us to the straight path.",
  },
  {
    number: 7,
    arabicText: "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ",
    transliteration: "Siraatal-lazeena an'amta 'alaihim ghayril-maghdoobi 'alaihim wa lad-daaalleen",
    translation: "The path of those upon whom You have bestowed favor, not of those who have evoked Your anger or of those who are astray.",
  },
];
