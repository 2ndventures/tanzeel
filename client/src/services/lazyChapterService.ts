import { Verse } from '@/lib/quranMetadata';
import { API_BASE_URL } from '@/config';

export type ArabicScript = 'uthmani' | 'indopak' | 'tajweed';

interface ChapterContent {
  id: number;
  verses: Verse[];
}

class LazyChapterService {
  // Cache keyed by "script:chapterId" for multi-edition support
  private cache: Map<string, ChapterContent> = new Map();
  private loadingPromises: Map<string, Promise<ChapterContent>> = new Map();

  private cacheKey(chapterId: number, script: ArabicScript = 'uthmani'): string {
    return `${script}:${chapterId}`;
  }

  async getChapter(chapterId: number, script: ArabicScript = 'uthmani'): Promise<ChapterContent> {
    const key = this.cacheKey(chapterId, script);

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    const loadPromise = this.loadChapter(chapterId, script);
    this.loadingPromises.set(key, loadPromise);

    try {
      const chapter = await loadPromise;
      this.cache.set(key, chapter);
      return chapter;
    } finally {
      this.loadingPromises.delete(key);
    }
  }

  private async loadChapter(chapterId: number, script: ArabicScript): Promise<ChapterContent> {
    if (script === 'uthmani') {
      // Use bundled static JSON (offline-capable)
      const url = `/data/chapters/${chapterId}.json`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load chapter ${chapterId}: ${response.statusText}`);
      }
      return response.json();
    }

    // For indopak/tajweed: fetch Arabic text from API, merge with bundled transliteration/translation
    const [baseChapter, scriptData] = await Promise.all([
      this.getChapter(chapterId, 'uthmani'), // ensures base data is cached
      this.fetchScriptText(chapterId, script),
    ]);

    // Build a lookup from verse_key (e.g. "2:3") to the script's Arabic text
    const textByKey = new Map<string, string>();
    for (const v of scriptData) {
      textByKey.set(v.verse_key, v.text);
    }

    // Merge: replace arabicText with the script edition, keep transliteration/translation
    const verses: Verse[] = baseChapter.verses.map((verse, index) => {
      const verseKey = `${chapterId}:${verse.number || index + 1}`;
      return {
        ...verse,
        arabicText: textByKey.get(verseKey) || verse.arabicText,
      };
    });

    return { id: chapterId, verses };
  }

  private async fetchScriptText(chapterId: number, script: ArabicScript): Promise<{ verse_key: string; text: string }[]> {
    const url = `${API_BASE_URL}/api/quran-text/${script}/${chapterId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${script} text for chapter ${chapterId}`);
    }
    const data = await response.json();
    return data.verses || [];
  }

  async getVerse(chapterId: number, verseNumber: number, script: ArabicScript = 'uthmani'): Promise<Verse | null> {
    const chapter = await this.getChapter(chapterId, script);
    return chapter.verses.find(v => v.number === verseNumber) || null;
  }

  async getVerses(chapterId: number, script: ArabicScript = 'uthmani'): Promise<Verse[]> {
    const chapter = await this.getChapter(chapterId, script);
    return chapter.verses;
  }

  preloadChapter(chapterId: number, script: ArabicScript = 'uthmani'): void {
    const key = this.cacheKey(chapterId, script);
    if (!this.cache.has(key) && !this.loadingPromises.has(key)) {
      this.getChapter(chapterId, script).catch(err => {
        console.warn(`Failed to preload chapter ${chapterId} (${script}):`, err);
      });
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  isCached(chapterId: number, script: ArabicScript = 'uthmani'): boolean {
    return this.cache.has(this.cacheKey(chapterId, script));
  }
}

export const lazyChapterService = new LazyChapterService();
