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
  { id: 112, arabicName: "Al-Ikhlas", englishName: "The Sincerity", verseCount: 4, revelationType: "Meccan" },
  { id: 113, arabicName: "Al-Falaq", englishName: "The Daybreak", verseCount: 5, revelationType: "Meccan" },
  { id: 114, arabicName: "An-Nas", englishName: "Mankind", verseCount: 6, revelationType: "Meccan" },
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

export const alIkhlasVerses: Verse[] = [
  {
    number: 1,
    arabicText: "قُلْ هُوَ ٱللَّهُ أَحَدٌ",
    transliteration: "Qul huwal laahu ahad",
    translation: "Say, He is Allah, the One.",
  },
  {
    number: 2,
    arabicText: "ٱللَّهُ ٱلصَّمَدُ",
    transliteration: "Allah hus-samad",
    translation: "Allah, the Eternal Refuge.",
  },
  {
    number: 3,
    arabicText: "لَمْ يَلِدْ وَلَمْ يُولَدْ",
    transliteration: "Lam yalid wa lam yoolad",
    translation: "He neither begets nor is born,",
  },
  {
    number: 4,
    arabicText: "وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ",
    transliteration: "Wa lam yakul-lahu kufuwan ahad",
    translation: "Nor is there to Him any equivalent.",
  },
];

export const alFalaqVerses: Verse[] = [
  {
    number: 1,
    arabicText: "قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ",
    transliteration: "Qul a'oozu birabbbil-falaq",
    translation: "Say, I seek refuge in the Lord of daybreak,",
  },
  {
    number: 2,
    arabicText: "مِن شَرِّ مَا خَلَقَ",
    transliteration: "Min sharri ma khalaq",
    translation: "From the evil of that which He created,",
  },
  {
    number: 3,
    arabicText: "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ",
    transliteration: "Wa min sharri ghaasiqin iza waqab",
    translation: "And from the evil of darkness when it settles,",
  },
  {
    number: 4,
    arabicText: "وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ",
    transliteration: "Wa min sharrin-naffaa-saati fil 'uqad",
    translation: "And from the evil of the blowers in knots,",
  },
  {
    number: 5,
    arabicText: "وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ",
    transliteration: "Wa min sharri haasidin iza hasad",
    translation: "And from the evil of an envier when he envies.",
  },
];

export const anNasVerses: Verse[] = [
  {
    number: 1,
    arabicText: "قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ",
    transliteration: "Qul a'oozu birabbin-naas",
    translation: "Say, I seek refuge in the Lord of mankind,",
  },
  {
    number: 2,
    arabicText: "مَلِكِ ٱلنَّاسِ",
    transliteration: "Malikin-naas",
    translation: "The Sovereign of mankind,",
  },
  {
    number: 3,
    arabicText: "إِلَٰهِ ٱلنَّاسِ",
    transliteration: "Ilaahin-naas",
    translation: "The God of mankind,",
  },
  {
    number: 4,
    arabicText: "مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ",
    transliteration: "Min sharril-waswasil-khannaas",
    translation: "From the evil of the retreating whisperer,",
  },
  {
    number: 5,
    arabicText: "ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ",
    transliteration: "Al-lazi yuwaswisu fee sudoorin-naas",
    translation: "Who whispers in the breasts of mankind,",
  },
  {
    number: 6,
    arabicText: "مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ",
    transliteration: "Minal-jinnati wan-naas",
    translation: "From among the jinn and mankind.",
  },
];

export function getChapterVerses(chapterId: number): Verse[] {
  const versesMap: { [key: number]: Verse[] } = {
    1: alFatihahVerses,
    112: alIkhlasVerses,
    113: alFalaqVerses,
    114: anNasVerses,
  };
  
  return versesMap[chapterId] || alFatihahVerses;
}

export function getChapterInfo(chapterId: number): Chapter | undefined {
  return chapters.find(c => c.id === chapterId);
}
