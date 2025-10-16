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
    id: "ar.abdulbasit",
    name: "Abdul Basit Abdul Samad",
    arabicName: "عبد الباسط عبد الصمد",
    style: "Mujawwad",
    featured: true,
  },
  {
    id: "ar.husary",
    name: "Mahmoud Khalil Al-Hussary",
    arabicName: "محمود خليل الحصري",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.minshawi",
    name: "Mohamed Siddiq El-Minshawi",
    arabicName: "محمد صديق المنشاوي",
    style: "Mujawwad",
    featured: true,
  },
  {
    id: "ar.saadalghamidi",
    name: "Saad Al-Ghamdi",
    arabicName: "سعد الغامدي",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.mahermuaiqly",
    name: "Maher Al-Muaiqly",
    arabicName: "ماهر المعيقلي",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.abdurrahmaansudais",
    name: "Abdul Rahman Al-Sudais",
    arabicName: "عبد الرحمن السديس",
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
    id: "ar.abdulbariaththubaity",
    name: "Abdul Bari Al-Thubaity",
    arabicName: "عبد الباري الثبيتي",
    style: "Murattal",
    featured: false,
  },
  {
    id: "ar.abdulazizazzahrani",
    name: "Abdul Aziz Al-Zahrani",
    arabicName: "عبد العزيز الزهراني",
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
  "Alafasy": "ar.alafasy",
  "Sudais": "ar.abdurrahmaansudais",
  "Ghamadi": "ar.saadalghamidi", // Saad Al-Ghamdi
};

// Convert legacy reciter name to API identifier
export const getLegacyReciterId = (legacyName: string): string => {
  return LEGACY_RECITER_MAP[legacyName] || DEFAULT_RECITER;
};
