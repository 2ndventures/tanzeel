/**
 * Comprehensive list of Quran reciters from Islamic Network CDN
 * All reciters listed have complete surah-level audio at 128kbps
 * Source: https://cdn.islamic.network/quran/info/by-surah/info.json
 */

export interface Reciter {
  id: string; // API identifier (e.g., "ar.alafasy")
  name: string; // Display name in English
  arabicName: string; // Arabic name
  style?: string; // Recitation style (e.g., "Murattal", "Mujawwad")
  featured?: boolean; // Show in featured list
}

export const RECITERS: Reciter[] = [
  {
    id: "ar.alafasy",
    name: "Mishary Rashid Alafasy",
    arabicName: "مشاري راشد العفاسي",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.abdulbasitmurattal",
    name: "Abdul Basit Abdul Samad",
    arabicName: "عبد الباسط عبد الصمد",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.muhammadsiddiqalminshawimujawwad",
    name: "Mohamed Siddiq El-Minshawi",
    arabicName: "محمد صديق المنشاوي",
    style: "Mujawwad",
    featured: true,
  },
  {
    id: "ar.saudalshuraim",
    name: "Saud Al-Shuraim",
    arabicName: "سعود الشريم",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.abdulbarimohammed",
    name: "Abdul Bari Mohammed",
    arabicName: "عبد الباري محمد",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.yasseraldossari",
    name: "Yasser Al-Dosari",
    arabicName: "ياسر الدوسري",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.ibrahimaldossari",
    name: "Ibrahim Al-Dosari",
    arabicName: "إبراهيم الدوسري",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.nasseralqatami",
    name: "Nasser Al-Qatami",
    arabicName: "ناصر القطامي",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.khaledalqahtani",
    name: "Khaled Al-Qahtani",
    arabicName: "خالد القحطاني",
    style: "Murattal",
    featured: false,
  },
  {
    id: "ar.waleednaehi",
    name: "Waleed Al-Naehi",
    arabicName: "وليد النعيحي",
    style: "Murattal",
    featured: false,
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

// Get reciter display name
export const getReciterDisplayName = (id: string): string => {
  const reciter = getReciterById(id);
  if (!reciter) return "Mishary Rashid Alafasy"; // Default
  
  return reciter.name;
};

// Default reciter
export const DEFAULT_RECITER = "ar.alafasy";

// Legacy mapping for backward compatibility
export const LEGACY_RECITER_MAP: Record<string, string> = {
  // Old string names
  "Alafasy": "ar.alafasy",
  "Sudais": "ar.saudalshuraim",
  "Ghamadi": "ar.yasseraldossari",
  // Old incorrect API IDs that don't exist on CDN
  "ar.abdulbasit": "ar.abdulbasitmurattal",
  "ar.husary": "ar.alafasy", // Not available, fallback to default
  "ar.minshawi": "ar.muhammadsiddiqalminshawimujawwad",
  "ar.saadalghamidi": "ar.yasseraldossari", // Not available, use similar reciter
  "ar.mahermuaiqly": "ar.alafasy", // Not available, fallback to default
  "ar.abdurrahmaansudais": "ar.saudalshuraim", // Sudais alternative
  "ar.shaatree": "ar.yasseraldossari", // Not available
};

// Convert legacy reciter name to API identifier
export const getLegacyReciterId = (legacyName: string): string => {
  return LEGACY_RECITER_MAP[legacyName] || DEFAULT_RECITER;
};
