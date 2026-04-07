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

export type LayoutMode = 'standard' | 'focused-flow' | 'mushaf';

// Utility function to remove "سُورَةُ" prefix from Arabic chapter names
// to match quran.com display format
export function getDisplayArabicName(arabicName: string): string {
  return arabicName.replace(/^سُورَةُ\s+/, '');
}

export const surahMeanings: Record<number, string> = {
  1: "The Opener",
  2: "The Cow",
  3: "Family of Imran",
  4: "The Women",
  5: "The Table Spread",
  6: "The Cattle",
  7: "The Heights",
  8: "The Spoils of War",
  9: "The Repentance",
  10: "Jonah",
  11: "Hud",
  12: "Joseph",
  13: "The Thunder",
  14: "Abraham",
  15: "The Rocky Tract",
  16: "The Bee",
  17: "The Night Journey",
  18: "The Cave",
  19: "Mary",
  20: "Ta-Ha",
  21: "The Prophets",
  22: "The Pilgrimage",
  23: "The Believers",
  24: "The Light",
  25: "The Criterion",
  26: "The Poets",
  27: "The Ant",
  28: "The Stories",
  29: "The Spider",
  30: "The Romans",
  31: "Luqman",
  32: "The Prostration",
  33: "The Combined Forces",
  34: "Sheba",
  35: "Originator",
  36: "Ya-Sin",
  37: "Those Who Set the Ranks",
  38: "Sad",
  39: "The Troops",
  40: "The Forgiver",
  41: "Explained in Detail",
  42: "The Consultation",
  43: "The Ornaments of Gold",
  44: "The Smoke",
  45: "The Crouching",
  46: "The Wind-Curved Sandhills",
  47: "Muhammad",
  48: "The Victory",
  49: "The Rooms",
  50: "Qaf",
  51: "The Winnowing Winds",
  52: "The Mount",
  53: "The Star",
  54: "The Moon",
  55: "The Beneficent",
  56: "The Inevitable",
  57: "The Iron",
  58: "The Pleading Woman",
  59: "The Exile",
  60: "She That Is to Be Examined",
  61: "The Ranks",
  62: "The Congregation",
  63: "The Hypocrites",
  64: "The Mutual Disillusion",
  65: "The Divorce",
  66: "The Prohibition",
  67: "The Sovereignty",
  68: "The Pen",
  69: "The Reality",
  70: "The Ascending Stairways",
  71: "Noah",
  72: "The Jinn",
  73: "The Enshrouded One",
  74: "The Cloaked One",
  75: "The Resurrection",
  76: "The Human",
  77: "The Emissaries",
  78: "The Tidings",
  79: "Those Who Drag Forth",
  80: "He Frowned",
  81: "The Overthrowing",
  82: "The Cleaving",
  83: "The Defrauding",
  84: "The Sundering",
  85: "The Mansions of the Stars",
  86: "The Nightcomer",
  87: "The Most High",
  88: "The Overwhelming",
  89: "The Dawn",
  90: "The City",
  91: "The Sun",
  92: "The Night",
  93: "The Morning Hours",
  94: "The Relief",
  95: "The Fig",
  96: "The Clot",
  97: "The Power",
  98: "The Clear Proof",
  99: "The Earthquake",
  100: "The Courser",
  101: "The Calamity",
  102: "The Rivalry in World Increase",
  103: "The Declining Day",
  104: "The Traducer",
  105: "The Elephant",
  106: "Quraysh",
  107: "The Small Kindnesses",
  108: "The Abundance",
  109: "The Disbelievers",
  110: "The Divine Support",
  111: "The Palm Fiber",
  112: "The Sincerity",
  113: "The Daybreak",
  114: "The Mankind",
};

export const chapters: Chapter[] = [
  {
    "id": 1,
    "arabicName": "سُورَةُ ٱلْفَاتِحَةِ",
    "englishName": "Al-Faatiha",
    "verseCount": 7,
    "revelationType": "Meccan"
  },
  {
    "id": 2,
    "arabicName": "سُورَةُ البَقَرَةِ",
    "englishName": "Al-Baqara",
    "verseCount": 286,
    "revelationType": "Medinan"
  },
  {
    "id": 3,
    "arabicName": "سُورَةُ آلِ عِمۡرَانَ",
    "englishName": "Aal-i-Imraan",
    "verseCount": 200,
    "revelationType": "Medinan"
  },
  {
    "id": 4,
    "arabicName": "سُورَةُ النِّسَاءِ",
    "englishName": "An-Nisaa",
    "verseCount": 176,
    "revelationType": "Medinan"
  },
  {
    "id": 5,
    "arabicName": "سُورَةُ المَائـِدَةِ",
    "englishName": "Al-Maaida",
    "verseCount": 120,
    "revelationType": "Medinan"
  },
  {
    "id": 6,
    "arabicName": "سُورَةُ الأَنۡعَامِ",
    "englishName": "Al-An'aam",
    "verseCount": 165,
    "revelationType": "Meccan"
  },
  {
    "id": 7,
    "arabicName": "سُورَةُ الأَعۡرَافِ",
    "englishName": "Al-A'raaf",
    "verseCount": 206,
    "revelationType": "Meccan"
  },
  {
    "id": 8,
    "arabicName": "سُورَةُ الأَنفَالِ",
    "englishName": "Al-Anfaal",
    "verseCount": 75,
    "revelationType": "Medinan"
  },
  {
    "id": 9,
    "arabicName": "سُورَةُ التَّوۡبَةِ",
    "englishName": "At-Tawba",
    "verseCount": 129,
    "revelationType": "Medinan"
  },
  {
    "id": 10,
    "arabicName": "سُورَةُ يُونُسَ",
    "englishName": "Yunus",
    "verseCount": 109,
    "revelationType": "Meccan"
  },
  {
    "id": 11,
    "arabicName": "سُورَةُ هُودٍ",
    "englishName": "Hud",
    "verseCount": 123,
    "revelationType": "Meccan"
  },
  {
    "id": 12,
    "arabicName": "سُورَةُ يُوسُفَ",
    "englishName": "Yusuf",
    "verseCount": 111,
    "revelationType": "Meccan"
  },
  {
    "id": 13,
    "arabicName": "سُورَةُ الرَّعۡدِ",
    "englishName": "Ar-Ra'd",
    "verseCount": 43,
    "revelationType": "Medinan"
  },
  {
    "id": 14,
    "arabicName": "سُورَةُ إِبۡرَاهِيمَ",
    "englishName": "Ibrahim",
    "verseCount": 52,
    "revelationType": "Meccan"
  },
  {
    "id": 15,
    "arabicName": "سُورَةُ الحِجۡرِ",
    "englishName": "Al-Hijr",
    "verseCount": 99,
    "revelationType": "Meccan"
  },
  {
    "id": 16,
    "arabicName": "سُورَةُ النَّحۡلِ",
    "englishName": "An-Nahl",
    "verseCount": 128,
    "revelationType": "Meccan"
  },
  {
    "id": 17,
    "arabicName": "سُورَةُ الإِسۡرَاءِ",
    "englishName": "Al-Israa",
    "verseCount": 111,
    "revelationType": "Meccan"
  },
  {
    "id": 18,
    "arabicName": "سُورَةُ الكَهۡفِ",
    "englishName": "Al-Kahf",
    "verseCount": 110,
    "revelationType": "Meccan"
  },
  {
    "id": 19,
    "arabicName": "سُورَةُ مَرۡيَمَ",
    "englishName": "Maryam",
    "verseCount": 98,
    "revelationType": "Meccan"
  },
  {
    "id": 20,
    "arabicName": "سُورَةُ طه",
    "englishName": "Taa-Haa",
    "verseCount": 135,
    "revelationType": "Meccan"
  },
  {
    "id": 21,
    "arabicName": "سُورَةُ الأَنبِيَاءِ",
    "englishName": "Al-Anbiyaa",
    "verseCount": 112,
    "revelationType": "Meccan"
  },
  {
    "id": 22,
    "arabicName": "سُورَةُ الحَجِّ",
    "englishName": "Al-Hajj",
    "verseCount": 78,
    "revelationType": "Medinan"
  },
  {
    "id": 23,
    "arabicName": "سُورَةُ المُؤۡمِنُونَ",
    "englishName": "Al-Muminoon",
    "verseCount": 118,
    "revelationType": "Meccan"
  },
  {
    "id": 24,
    "arabicName": "سُورَةُ النُّورِ",
    "englishName": "An-Noor",
    "verseCount": 64,
    "revelationType": "Medinan"
  },
  {
    "id": 25,
    "arabicName": "سُورَةُ الفُرۡقَانِ",
    "englishName": "Al-Furqaan",
    "verseCount": 77,
    "revelationType": "Meccan"
  },
  {
    "id": 26,
    "arabicName": "سُورَةُ الشُّعَرَاءِ",
    "englishName": "Ash-Shu'araa",
    "verseCount": 227,
    "revelationType": "Meccan"
  },
  {
    "id": 27,
    "arabicName": "سُورَةُ النَّمۡلِ",
    "englishName": "An-Naml",
    "verseCount": 93,
    "revelationType": "Meccan"
  },
  {
    "id": 28,
    "arabicName": "سُورَةُ القَصَصِ",
    "englishName": "Al-Qasas",
    "verseCount": 88,
    "revelationType": "Meccan"
  },
  {
    "id": 29,
    "arabicName": "سُورَةُ العَنكَبُوتِ",
    "englishName": "Al-Ankaboot",
    "verseCount": 69,
    "revelationType": "Meccan"
  },
  {
    "id": 30,
    "arabicName": "سُورَةُ الرُّومِ",
    "englishName": "Ar-Room",
    "verseCount": 60,
    "revelationType": "Meccan"
  },
  {
    "id": 31,
    "arabicName": "سُورَةُ لُقۡمَانَ",
    "englishName": "Luqman",
    "verseCount": 34,
    "revelationType": "Meccan"
  },
  {
    "id": 32,
    "arabicName": "سُورَةُ السَّجۡدَةِ",
    "englishName": "As-Sajda",
    "verseCount": 30,
    "revelationType": "Meccan"
  },
  {
    "id": 33,
    "arabicName": "سُورَةُ الأَحۡزَابِ",
    "englishName": "Al-Ahzaab",
    "verseCount": 73,
    "revelationType": "Medinan"
  },
  {
    "id": 34,
    "arabicName": "سُورَةُ سَبَإٍ",
    "englishName": "Saba",
    "verseCount": 54,
    "revelationType": "Meccan"
  },
  {
    "id": 35,
    "arabicName": "سُورَةُ فَاطِرٍ",
    "englishName": "Faatir",
    "verseCount": 45,
    "revelationType": "Meccan"
  },
  {
    "id": 36,
    "arabicName": "سُورَةُ يسٓ",
    "englishName": "Yaseen",
    "verseCount": 83,
    "revelationType": "Meccan"
  },
  {
    "id": 37,
    "arabicName": "سُورَةُ الصَّافَّاتِ",
    "englishName": "As-Saaffaat",
    "verseCount": 182,
    "revelationType": "Meccan"
  },
  {
    "id": 38,
    "arabicName": "سُورَةُ صٓ",
    "englishName": "Saad",
    "verseCount": 88,
    "revelationType": "Meccan"
  },
  {
    "id": 39,
    "arabicName": "سُورَةُ الزُّمَرِ",
    "englishName": "Az-Zumar",
    "verseCount": 75,
    "revelationType": "Meccan"
  },
  {
    "id": 40,
    "arabicName": "سُورَةُ غَافِرٍ",
    "englishName": "Ghafir",
    "verseCount": 85,
    "revelationType": "Meccan"
  },
  {
    "id": 41,
    "arabicName": "سُورَةُ فُصِّلَتۡ",
    "englishName": "Fussilat",
    "verseCount": 54,
    "revelationType": "Meccan"
  },
  {
    "id": 42,
    "arabicName": "سُورَةُ الشُّورَىٰ",
    "englishName": "Ash-Shura",
    "verseCount": 53,
    "revelationType": "Meccan"
  },
  {
    "id": 43,
    "arabicName": "سُورَةُ الزُّخۡرُفِ",
    "englishName": "Az-Zukhruf",
    "verseCount": 89,
    "revelationType": "Meccan"
  },
  {
    "id": 44,
    "arabicName": "سُورَةُ الدُّخَانِ",
    "englishName": "Ad-Dukhaan",
    "verseCount": 59,
    "revelationType": "Meccan"
  },
  {
    "id": 45,
    "arabicName": "سُورَةُ الجَاثِيَةِ",
    "englishName": "Al-Jaathiya",
    "verseCount": 37,
    "revelationType": "Meccan"
  },
  {
    "id": 46,
    "arabicName": "سُورَةُ الأَحۡقَافِ",
    "englishName": "Al-Ahqaf",
    "verseCount": 35,
    "revelationType": "Meccan"
  },
  {
    "id": 47,
    "arabicName": "سُورَةُ مُحَمَّدٍ",
    "englishName": "Muhammad",
    "verseCount": 38,
    "revelationType": "Medinan"
  },
  {
    "id": 48,
    "arabicName": "سُورَةُ الفَتۡحِ",
    "englishName": "Al-Fath",
    "verseCount": 29,
    "revelationType": "Medinan"
  },
  {
    "id": 49,
    "arabicName": "سُورَةُ الحُجُرَاتِ",
    "englishName": "Al-Hujuraat",
    "verseCount": 18,
    "revelationType": "Medinan"
  },
  {
    "id": 50,
    "arabicName": "سُورَةُ قٓ",
    "englishName": "Qaaf",
    "verseCount": 45,
    "revelationType": "Meccan"
  },
  {
    "id": 51,
    "arabicName": "سُورَةُ الذَّارِيَاتِ",
    "englishName": "Adh-Dhaariyat",
    "verseCount": 60,
    "revelationType": "Meccan"
  },
  {
    "id": 52,
    "arabicName": "سُورَةُ الطُّورِ",
    "englishName": "At-Tur",
    "verseCount": 49,
    "revelationType": "Meccan"
  },
  {
    "id": 53,
    "arabicName": "سُورَةُ النَّجۡمِ",
    "englishName": "An-Najm",
    "verseCount": 62,
    "revelationType": "Meccan"
  },
  {
    "id": 54,
    "arabicName": "سُورَةُ القَمَرِ",
    "englishName": "Al-Qamar",
    "verseCount": 55,
    "revelationType": "Meccan"
  },
  {
    "id": 55,
    "arabicName": "سُورَةُ الرَّحۡمَـٰنِ",
    "englishName": "Ar-Rahmaan",
    "verseCount": 78,
    "revelationType": "Medinan"
  },
  {
    "id": 56,
    "arabicName": "سُورَةُ الوَاقِعَةِ",
    "englishName": "Al-Waaqia",
    "verseCount": 96,
    "revelationType": "Meccan"
  },
  {
    "id": 57,
    "arabicName": "سُورَةُ الحَدِيدِ",
    "englishName": "Al-Hadid",
    "verseCount": 29,
    "revelationType": "Medinan"
  },
  {
    "id": 58,
    "arabicName": "سُورَةُ المُجَادلَةِ",
    "englishName": "Al-Mujaadila",
    "verseCount": 22,
    "revelationType": "Medinan"
  },
  {
    "id": 59,
    "arabicName": "سُورَةُ الحَشۡرِ",
    "englishName": "Al-Hashr",
    "verseCount": 24,
    "revelationType": "Medinan"
  },
  {
    "id": 60,
    "arabicName": "سُورَةُ المُمۡتَحنَةِ",
    "englishName": "Al-Mumtahana",
    "verseCount": 13,
    "revelationType": "Medinan"
  },
  {
    "id": 61,
    "arabicName": "سُورَةُ الصَّفِّ",
    "englishName": "As-Saff",
    "verseCount": 14,
    "revelationType": "Medinan"
  },
  {
    "id": 62,
    "arabicName": "سُورَةُ الجُمُعَةِ",
    "englishName": "Al-Jumu'a",
    "verseCount": 11,
    "revelationType": "Medinan"
  },
  {
    "id": 63,
    "arabicName": "سُورَةُ المُنَافِقُونَ",
    "englishName": "Al-Munaafiqoon",
    "verseCount": 11,
    "revelationType": "Medinan"
  },
  {
    "id": 64,
    "arabicName": "سُورَةُ التَّغَابُنِ",
    "englishName": "At-Taghaabun",
    "verseCount": 18,
    "revelationType": "Medinan"
  },
  {
    "id": 65,
    "arabicName": "سُورَةُ الطَّلَاقِ",
    "englishName": "At-Talaaq",
    "verseCount": 12,
    "revelationType": "Medinan"
  },
  {
    "id": 66,
    "arabicName": "سُورَةُ التَّحۡرِيمِ",
    "englishName": "At-Tahrim",
    "verseCount": 12,
    "revelationType": "Medinan"
  },
  {
    "id": 67,
    "arabicName": "سُورَةُ المُلۡكِ",
    "englishName": "Al-Mulk",
    "verseCount": 30,
    "revelationType": "Meccan"
  },
  {
    "id": 68,
    "arabicName": "سُورَةُ القَلَمِ",
    "englishName": "Al-Qalam",
    "verseCount": 52,
    "revelationType": "Meccan"
  },
  {
    "id": 69,
    "arabicName": "سُورَةُ الحَاقَّةِ",
    "englishName": "Al-Haaqqa",
    "verseCount": 52,
    "revelationType": "Meccan"
  },
  {
    "id": 70,
    "arabicName": "سُورَةُ المَعَارِجِ",
    "englishName": "Al-Ma'aarij",
    "verseCount": 44,
    "revelationType": "Meccan"
  },
  {
    "id": 71,
    "arabicName": "سُورَةُ نُوحٍ",
    "englishName": "Nooh",
    "verseCount": 28,
    "revelationType": "Meccan"
  },
  {
    "id": 72,
    "arabicName": "سُورَةُ الجِنِّ",
    "englishName": "Al-Jinn",
    "verseCount": 28,
    "revelationType": "Meccan"
  },
  {
    "id": 73,
    "arabicName": "سُورَةُ المُزَّمِّلِ",
    "englishName": "Al-Muzzammil",
    "verseCount": 20,
    "revelationType": "Meccan"
  },
  {
    "id": 74,
    "arabicName": "سُورَةُ المُدَّثِّرِ",
    "englishName": "Al-Muddaththir",
    "verseCount": 56,
    "revelationType": "Meccan"
  },
  {
    "id": 75,
    "arabicName": "سُورَةُ القِيَامَةِ",
    "englishName": "Al-Qiyaama",
    "verseCount": 40,
    "revelationType": "Meccan"
  },
  {
    "id": 76,
    "arabicName": "سُورَةُ الإِنسَانِ",
    "englishName": "Al-Insaan",
    "verseCount": 31,
    "revelationType": "Medinan"
  },
  {
    "id": 77,
    "arabicName": "سُورَةُ المُرۡسَلَاتِ",
    "englishName": "Al-Mursalaat",
    "verseCount": 50,
    "revelationType": "Meccan"
  },
  {
    "id": 78,
    "arabicName": "سُورَةُ النَّبَإِ",
    "englishName": "An-Naba",
    "verseCount": 40,
    "revelationType": "Meccan"
  },
  {
    "id": 79,
    "arabicName": "سُورَةُ النَّازِعَاتِ",
    "englishName": "An-Naazi'aat",
    "verseCount": 46,
    "revelationType": "Meccan"
  },
  {
    "id": 80,
    "arabicName": "سُورَةُ عَبَسَ",
    "englishName": "Abasa",
    "verseCount": 42,
    "revelationType": "Meccan"
  },
  {
    "id": 81,
    "arabicName": "سُورَةُ التَّكۡوِيرِ",
    "englishName": "At-Takwir",
    "verseCount": 29,
    "revelationType": "Meccan"
  },
  {
    "id": 82,
    "arabicName": "سُورَةُ الانفِطَارِ",
    "englishName": "Al-Infitaar",
    "verseCount": 19,
    "revelationType": "Meccan"
  },
  {
    "id": 83,
    "arabicName": "سُورَةُ المُطَفِّفِينَ",
    "englishName": "Al-Mutaffifin",
    "verseCount": 36,
    "revelationType": "Meccan"
  },
  {
    "id": 84,
    "arabicName": "سُورَةُ الانشِقَاقِ",
    "englishName": "Al-Inshiqaaq",
    "verseCount": 25,
    "revelationType": "Meccan"
  },
  {
    "id": 85,
    "arabicName": "سُورَةُ البُرُوجِ",
    "englishName": "Al-Burooj",
    "verseCount": 22,
    "revelationType": "Meccan"
  },
  {
    "id": 86,
    "arabicName": "سُورَةُ الطَّارِقِ",
    "englishName": "At-Taariq",
    "verseCount": 17,
    "revelationType": "Meccan"
  },
  {
    "id": 87,
    "arabicName": "سُورَةُ الأَعۡلَىٰ",
    "englishName": "Al-A'laa",
    "verseCount": 19,
    "revelationType": "Meccan"
  },
  {
    "id": 88,
    "arabicName": "سُورَةُ الغَاشِيَةِ",
    "englishName": "Al-Ghaashiya",
    "verseCount": 26,
    "revelationType": "Meccan"
  },
  {
    "id": 89,
    "arabicName": "سُورَةُ الفَجۡرِ",
    "englishName": "Al-Fajr",
    "verseCount": 30,
    "revelationType": "Meccan"
  },
  {
    "id": 90,
    "arabicName": "سُورَةُ البَلَدِ",
    "englishName": "Al-Balad",
    "verseCount": 20,
    "revelationType": "Meccan"
  },
  {
    "id": 91,
    "arabicName": "سُورَةُ الشَّمۡسِ",
    "englishName": "Ash-Shams",
    "verseCount": 15,
    "revelationType": "Meccan"
  },
  {
    "id": 92,
    "arabicName": "سُورَةُ اللَّيۡلِ",
    "englishName": "Al-Lail",
    "verseCount": 21,
    "revelationType": "Meccan"
  },
  {
    "id": 93,
    "arabicName": "سُورَةُ الضُّحَىٰ",
    "englishName": "Ad-Dhuhaa",
    "verseCount": 11,
    "revelationType": "Meccan"
  },
  {
    "id": 94,
    "arabicName": "سُورَةُ الشَّرۡحِ",
    "englishName": "Ash-Sharh",
    "verseCount": 8,
    "revelationType": "Meccan"
  },
  {
    "id": 95,
    "arabicName": "سُورَةُ التِّينِ",
    "englishName": "At-Tin",
    "verseCount": 8,
    "revelationType": "Meccan"
  },
  {
    "id": 96,
    "arabicName": "سُورَةُ العَلَقِ",
    "englishName": "Al-Alaq",
    "verseCount": 19,
    "revelationType": "Meccan"
  },
  {
    "id": 97,
    "arabicName": "سُورَةُ القَدۡرِ",
    "englishName": "Al-Qadr",
    "verseCount": 5,
    "revelationType": "Meccan"
  },
  {
    "id": 98,
    "arabicName": "سُورَةُ البَيِّنَةِ",
    "englishName": "Al-Bayyina",
    "verseCount": 8,
    "revelationType": "Medinan"
  },
  {
    "id": 99,
    "arabicName": "سُورَةُ الزَّلۡزَلَةِ",
    "englishName": "Az-Zalzala",
    "verseCount": 8,
    "revelationType": "Medinan"
  },
  {
    "id": 100,
    "arabicName": "سُورَةُ العَادِيَاتِ",
    "englishName": "Al-Aadiyaat",
    "verseCount": 11,
    "revelationType": "Meccan"
  },
  {
    "id": 101,
    "arabicName": "سُورَةُ القَارِعَةِ",
    "englishName": "Al-Qaari'a",
    "verseCount": 11,
    "revelationType": "Meccan"
  },
  {
    "id": 102,
    "arabicName": "سُورَةُ التَّكَاثُرِ",
    "englishName": "At-Takaathur",
    "verseCount": 8,
    "revelationType": "Meccan"
  },
  {
    "id": 103,
    "arabicName": "سُورَةُ العَصۡرِ",
    "englishName": "Al-Asr",
    "verseCount": 3,
    "revelationType": "Meccan"
  },
  {
    "id": 104,
    "arabicName": "سُورَةُ الهُمَزَةِ",
    "englishName": "Al-Humaza",
    "verseCount": 9,
    "revelationType": "Meccan"
  },
  {
    "id": 105,
    "arabicName": "سُورَةُ الفِيلِ",
    "englishName": "Al-Fil",
    "verseCount": 5,
    "revelationType": "Meccan"
  },
  {
    "id": 106,
    "arabicName": "سُورَةُ قُرَيۡشٍ",
    "englishName": "Quraish",
    "verseCount": 4,
    "revelationType": "Meccan"
  },
  {
    "id": 107,
    "arabicName": "سُورَةُ المَاعُونِ",
    "englishName": "Al-Maa'un",
    "verseCount": 7,
    "revelationType": "Meccan"
  },
  {
    "id": 108,
    "arabicName": "سُورَةُ الكَوۡثَرِ",
    "englishName": "Al-Kawthar",
    "verseCount": 3,
    "revelationType": "Meccan"
  },
  {
    "id": 109,
    "arabicName": "سُورَةُ الكَافِرُونَ",
    "englishName": "Al-Kaafiroon",
    "verseCount": 6,
    "revelationType": "Meccan"
  },
  {
    "id": 110,
    "arabicName": "سُورَةُ النَّصۡرِ",
    "englishName": "An-Nasr",
    "verseCount": 3,
    "revelationType": "Medinan"
  },
  {
    "id": 111,
    "arabicName": "سُورَةُ المَسَدِ",
    "englishName": "Al-Masad",
    "verseCount": 5,
    "revelationType": "Meccan"
  },
  {
    "id": 112,
    "arabicName": "سُورَةُ الإِخۡلَاصِ",
    "englishName": "Al-Ikhlaas",
    "verseCount": 4,
    "revelationType": "Meccan"
  },
  {
    "id": 113,
    "arabicName": "سُورَةُ الفَلَقِ",
    "englishName": "Al-Falaq",
    "verseCount": 5,
    "revelationType": "Meccan"
  },
  {
    "id": 114,
    "arabicName": "سُورَةُ النَّاسِ",
    "englishName": "An-Naas",
    "verseCount": 6,
    "revelationType": "Meccan"
  }
];

export function getChapterInfo(chapterId: number): Chapter | undefined {
  return chapters.find(c => c.id === chapterId);
}

export interface Juz {
  id: number;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
}

export const juzData: Juz[] = [
  { id: 1, startChapter: 1, startVerse: 1, endChapter: 2, endVerse: 141 },
  { id: 2, startChapter: 2, startVerse: 142, endChapter: 2, endVerse: 252 },
  { id: 3, startChapter: 2, startVerse: 253, endChapter: 3, endVerse: 92 },
  { id: 4, startChapter: 3, startVerse: 93, endChapter: 4, endVerse: 23 },
  { id: 5, startChapter: 4, startVerse: 24, endChapter: 4, endVerse: 147 },
  { id: 6, startChapter: 4, startVerse: 148, endChapter: 5, endVerse: 82 },
  { id: 7, startChapter: 5, startVerse: 83, endChapter: 6, endVerse: 110 },
  { id: 8, startChapter: 6, startVerse: 111, endChapter: 7, endVerse: 87 },
  { id: 9, startChapter: 7, startVerse: 88, endChapter: 8, endVerse: 40 },
  { id: 10, startChapter: 8, startVerse: 41, endChapter: 9, endVerse: 92 },
  { id: 11, startChapter: 9, startVerse: 93, endChapter: 11, endVerse: 5 },
  { id: 12, startChapter: 11, startVerse: 6, endChapter: 12, endVerse: 52 },
  { id: 13, startChapter: 12, startVerse: 53, endChapter: 14, endVerse: 52 },
  { id: 14, startChapter: 15, startVerse: 1, endChapter: 16, endVerse: 128 },
  { id: 15, startChapter: 17, startVerse: 1, endChapter: 18, endVerse: 74 },
  { id: 16, startChapter: 18, startVerse: 75, endChapter: 20, endVerse: 135 },
  { id: 17, startChapter: 21, startVerse: 1, endChapter: 22, endVerse: 78 },
  { id: 18, startChapter: 23, startVerse: 1, endChapter: 25, endVerse: 20 },
  { id: 19, startChapter: 25, startVerse: 21, endChapter: 27, endVerse: 55 },
  { id: 20, startChapter: 27, startVerse: 56, endChapter: 29, endVerse: 45 },
  { id: 21, startChapter: 29, startVerse: 46, endChapter: 33, endVerse: 30 },
  { id: 22, startChapter: 33, startVerse: 31, endChapter: 36, endVerse: 27 },
  { id: 23, startChapter: 36, startVerse: 28, endChapter: 39, endVerse: 31 },
  { id: 24, startChapter: 39, startVerse: 32, endChapter: 41, endVerse: 46 },
  { id: 25, startChapter: 41, startVerse: 47, endChapter: 45, endVerse: 37 },
  { id: 26, startChapter: 46, startVerse: 1, endChapter: 51, endVerse: 30 },
  { id: 27, startChapter: 51, startVerse: 31, endChapter: 57, endVerse: 29 },
  { id: 28, startChapter: 58, startVerse: 1, endChapter: 66, endVerse: 12 },
  { id: 29, startChapter: 67, startVerse: 1, endChapter: 77, endVerse: 50 },
  { id: 30, startChapter: 78, startVerse: 1, endChapter: 114, endVerse: 6 },
];
