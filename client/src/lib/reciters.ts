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
  // Featured reciters (most popular)
  {
    id: "ar.alafasy",
    name: "Mishary Rashid al-Afasy",
    arabicName: "مشاري العفاسي",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.abdurrahmaansudais",
    name: "Abdur-Rahman as-Sudais",
    arabicName: "عبدالرحمن السديس",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.shaatree",
    name: "Abu Bakr al-Shatri",
    arabicName: "أبو بكر الشاطري",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.husary",
    name: "Mahmoud Khalil Al-Husary",
    arabicName: "محمود خليل الحصري",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.mahermuaiqly",
    name: "Maher al-Muaiqly",
    arabicName: "ماهر المعيقلي",
    style: "Murattal",
    featured: true,
  },
  
  // AbdulBaset AbdulSamad variations
  {
    id: "ar.abdulsamad",
    name: "AbdulBaset AbdulSamad",
    arabicName: "عبدالباسط عبدالصمد",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.abdulbasitmurattal",
    name: "AbdulBaset AbdulSamad - Mujawwad",
    arabicName: "عبد الباسط عبد الصمد المرتل",
    style: "Mujawwad",
  },
  
  // Minshawi variations
  {
    id: "ar.minshawi",
    name: "Mohamed Siddiq al-Minshawi",
    arabicName: "محمد صديق المنشاوي",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.minshawimujawwad",
    name: "Mohamed Siddiq al-Minshawi - Mujawwad",
    arabicName: "محمد صديق المنشاوي (المجود)",
    style: "Mujawwad",
  },
  
  // Husary variations
  {
    id: "ar.husarymujawwad",
    name: "Mahmoud Khalil Al-Husary - Mujawwad",
    arabicName: "محمود خليل الحصري (المجود)",
    style: "Mujawwad",
  },
  
  // Other popular reciters
  {
    id: "ar.ahmedajamy",
    name: "Ahmed ibn Ali al-Ajamy",
    arabicName: "أحمد بن علي العجمي",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.hanirifai",
    name: "Hani ar-Rifai",
    arabicName: "هاني الرفاعي",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.saoodshuraym",
    name: "Sa'ud ash-Shuraym",
    arabicName: "سعود الشريم",
    style: "Murattal",
    featured: true,
  },
  {
    id: "ar.muhammadayyoub",
    name: "Muhammad Ayyoub",
    arabicName: "محمد أيوب",
    style: "Murattal",
  },
  {
    id: "ar.muhammadjibreel",
    name: "Muhammad Jibreel",
    arabicName: "محمد جبريل",
    style: "Murattal",
  },
  {
    id: "ar.abdullahbasfar",
    name: "Abdullah Basfar",
    arabicName: "عبد الله بصفر",
    style: "Murattal",
  },
  {
    id: "ar.hudhaify",
    name: "Ali al-Hudhaify",
    arabicName: "علي بن عبدالرحمن الحذيفي",
    style: "Murattal",
  },
  {
    id: "ar.ibrahimakhbar",
    name: "Ibrahim Akhdar",
    arabicName: "إبراهيم الأخضر",
    style: "Murattal",
  },
  {
    id: "ar.aymanswoaid",
    name: "Ayman Sowaid",
    arabicName: "أيمن سويد",
    style: "Murattal",
  },
  {
    id: "ar.parhizgar",
    name: "Shahriar Parhizgar",
    arabicName: "شهریار پرهیزگار",
    style: "Murattal",
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
  if (!reciter) return "Mishary Rashid al-Afasy"; // Default
  
  return reciter.style 
    ? `${reciter.name} - ${reciter.style}`
    : reciter.name;
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
