import { chapters, surahMeanings, type Chapter } from "@/lib/quranMetadata";

/**
 * Normalizes surah names for forgiving search: strips "Al-"/"An-" prefixes,
 * collapses doubled vowels, drops hyphens/apostrophes.
 * Shared by the Surahs page and the playbar surah picker.
 */
export const normalizeSearch = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/^(al-|ar-|as-|an-|at-|az-)/i, '')
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'e')
    .replace(/ii/g, 'i')
    .replace(/oo/g, 'o')
    .replace(/uu/g, 'u')
    .replace(/[-']/g, '');
};

/** True when the chapter matches the query (name, number, meaning, fuzzy). */
export const chapterMatchesQuery = (chapter: Chapter, rawQuery: string): boolean => {
  const query = rawQuery.toLowerCase().trim();
  if (!query) return true;
  const englishName = chapter.englishName.toLowerCase();
  const arabicName = chapter.arabicName.toLowerCase();

  if (englishName.includes(query) || arabicName.includes(query) || chapter.id.toString().includes(query)) {
    return true;
  }

  const meaning = (surahMeanings[chapter.id] || '').toLowerCase();
  if (meaning.includes(query)) return true;

  const normalizedQuery = normalizeSearch(query);
  const normalizedEnglish = normalizeSearch(englishName);

  if (normalizedEnglish.includes(normalizedQuery)) return true;

  // Tolerate trailing-h variations (Fatiha vs Fatihah)
  if (normalizedQuery.endsWith('h')) {
    if (normalizedEnglish.includes(normalizedQuery.slice(0, -1))) return true;
  } else {
    if (normalizedEnglish.includes(normalizedQuery + 'h')) return true;
  }

  return false;
};

export const filterChapters = (query: string): Chapter[] =>
  chapters.filter((chapter) => chapterMatchesQuery(chapter, query));
