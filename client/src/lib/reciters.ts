/**
 * Comprehensive list of Quran reciters
 * Audio source: EveryAyah.com (verse-by-verse audio files)
 * Format: https://everyayah.com/data/{everyAyahFolder}/{SURAH}{AYAH}.mp3
 */

export interface Reciter {
  id: string; // Internal identifier
  name: string; // Display name in English
  arabicName: string; // Arabic name
  style?: string; // Recitation style (e.g., "Murattal", "Mujawwad")
  featured?: boolean; // Show in featured list
  everyAyahFolder: string; // EveryAyah.com folder name for verse-by-verse audio
}

export const RECITERS: Reciter[] = [
  {
    id: "alafasy",
    name: "Mishary Rashid Alafasy",
    arabicName: "مشاري راشد العفاسي",
    style: "Murattal",
    featured: true,
    everyAyahFolder: "Alafasy_128kbps",
  },
  {
    id: "abdul_basit",
    name: "Abdul Basit Abdul Samad",
    arabicName: "عبد الباسط عبد الصمد",
    style: "Murattal",
    featured: true,
    everyAyahFolder: "Abdul_Basit_Murattal_192kbps",
  },
  {
    id: "abdul_basit_mujawwad",
    name: "Abdul Basit Abdul Samad",
    arabicName: "عبد الباسط عبد الصمد",
    style: "Mujawwad",
    featured: true,
    everyAyahFolder: "Abdul_Basit_Mujawwad_128kbps",
  },
  {
    id: "sudais",
    name: "Abdurrahmaan As-Sudais",
    arabicName: "عبد الرحمن السديس",
    style: "Murattal",
    featured: true,
    everyAyahFolder: "Abdurrahmaan_As-Sudais_192kbps",
  },
  {
    id: "ash_shaatree",
    name: "Abu Bakr Ash-Shaatree",
    arabicName: "أبو بكر الشاطري",
    style: "Murattal",
    featured: true,
    everyAyahFolder: "Abu_Bakr_Ash-Shaatree_128kbps",
  },
  {
    id: "hudhaify",
    name: "Ali Al-Hudhaify",
    arabicName: "علي الحذيفي",
    style: "Murattal",
    featured: true,
    everyAyahFolder: "Hudhaify_128kbps",
  },
  {
    id: "hani_rifai",
    name: "Hani Rifai",
    arabicName: "هاني الرفاعي",
    style: "Murattal",
    featured: true,
    everyAyahFolder: "Hani_Rifai_192kbps",
  },
  {
    id: "akram_alalaqimy",
    name: "Akram Al-Alaqimy",
    arabicName: "أكرم العلاقمي",
    style: "Murattal",
    featured: true,
    everyAyahFolder: "Akram_AlAlaqimy_128kbps",
  },
];

// Get featured reciters only
export const getFeaturedReciters = (): Reciter[] => {
  return RECITERS.filter(r => r.featured);
};

// Get all reciters
export const getAllReciters = (): Reciter[] => {
  return RECITERS;
};

// Get reciter by ID
export const getReciterById = (id: string): Reciter | undefined => {
  return RECITERS.find(r => r.id === id);
};

// Check if reciter ID is valid (exists in RECITERS)
export const isValidReciterId = (id: string): boolean => {
  return RECITERS.some(r => r.id === id);
};

// Default reciter
export const DEFAULT_RECITER = "alafasy";

export const RECITER_TO_QURAN_COM_ID: Record<string, number> = {
  'alafasy': 7,
  'abdul_basit': 2,          // Quran.com ID 2 → qdc/abdul_baset/murattal
  'abdul_basit_mujawwad': 1, // Quran.com ID 1 → qdc/abdul_baset/mujawwad
  'sudais': 11,              // Quran.com ID 11 → qdc/abdurrahmaan_as_sudais/murattal
  'ash_shaatree': 5,
  'hudhaify': 3,
  'hani_rifai': 9,
  'akram_alalaqimy': 11,
};

export function getQuranComReciterId(reciterId: string): number {
  return RECITER_TO_QURAN_COM_ID[reciterId] || 7;
}

// Legacy mapping for backward compatibility with old reciter IDs
export const LEGACY_RECITER_MAP: Record<string, string> = {
  // Old string names
  "Alafasy": "alafasy",
  "Sudais": "sudais",
  // Old Islamic Network API IDs
  "ar.alafasy": "alafasy",
  "ar.abdulbasitmurattal": "abdul_basit",
  "ar.muhammadsiddiqalminshawimujawwad": "abdul_basit_mujawwad",
  "ar.saudalshuraim": "sudais",
  "ar.abdulbarimohammed": "abdul_basit",
  "ar.yasseraldossari": "ash_shaatree",
  "ar.ibrahimaldossari": "ash_shaatree",
  "ar.nasseralqatami": "ash_shaatree",
  "ar.khaledalqahtani": "ash_shaatree",
  "ar.waleednaehi": "ash_shaatree",
  "ar.abdulbasit": "abdul_basit",
  "ar.husary": "alafasy",
  "ar.minshawi": "abdul_basit_mujawwad",
  "ar.saadalghamidi": "ash_shaatree",
  "ar.mahermuaiqly": "alafasy",
  "ar.abdurrahmaansudais": "sudais",
  "ar.shaatree": "ash_shaatree",
};

// Convert legacy reciter name to new identifier
export const getLegacyReciterId = (legacyName: string): string => {
  return LEGACY_RECITER_MAP[legacyName] || DEFAULT_RECITER;
};
