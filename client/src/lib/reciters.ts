/**
 * Comprehensive list of Quran reciters from Islamic Network API
 * Source: http://api.alquran.cloud/v1/edition/format/audio
 */

export interface Reciter {
  id: string; // API identifier (e.g., "ar.alafasy")
  name: string; // Display name in English
  arabicName: string; // Arabic name
  style?: string; // Recitation style (e.g., "Murattal", "Mujawwad")
  featured?: boolean; // Show in featured list
}

export const RECITERS: Reciter[] = [
  // NOTE: Currently only Alafasy has full surah audio files at 128kbps on Islamic Network CDN
  // Other reciters may fallback to Alafasy if audio is unavailable
  {
    id: "ar.alafasy",
    name: "Mishary Alafasy",
    arabicName: "مشاري العفاسي",
    featured: true,
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
  "Ghamadi": "ar.shaatree", // Using Shatri as closest alternative
};

// Convert legacy reciter name to API identifier
export const getLegacyReciterId = (legacyName: string): string => {
  return LEGACY_RECITER_MAP[legacyName] || DEFAULT_RECITER;
};
