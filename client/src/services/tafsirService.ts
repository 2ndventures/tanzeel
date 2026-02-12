import { API_BASE_URL } from '@/config';

export const DEFAULT_TAFSIR_ID = 169; // Ibn Kathir English

export interface TafsirEntry {
  verse_key: string;
  text: string;
}

interface TafsirChapterResponse {
  tafsirs: TafsirEntry[];
}

class TafsirService {
  private cache: Map<string, TafsirEntry[]> = new Map();
  private loadingPromises: Map<string, Promise<TafsirEntry[]>> = new Map();

  private cacheKey(tafsirId: number, chapterId: number): string {
    return `${tafsirId}:${chapterId}`;
  }

  async getTafsirForChapter(tafsirId: number, chapterId: number): Promise<TafsirEntry[]> {
    const key = this.cacheKey(tafsirId, chapterId);

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    const loadPromise = this.fetchTafsir(tafsirId, chapterId);
    this.loadingPromises.set(key, loadPromise);

    try {
      const entries = await loadPromise;
      this.cache.set(key, entries);
      return entries;
    } finally {
      this.loadingPromises.delete(key);
    }
  }

  private async fetchTafsir(tafsirId: number, chapterId: number): Promise<TafsirEntry[]> {
    const url = `${API_BASE_URL}/api/tafsir/${tafsirId}/by-chapter/${chapterId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load tafsir ${tafsirId} for chapter ${chapterId}`);
    }
    const data: TafsirChapterResponse = await response.json();
    return data.tafsirs || [];
  }

  getTafsirForVerse(chapterData: TafsirEntry[], verseKey: string): TafsirEntry | undefined {
    return chapterData.find(t => t.verse_key === verseKey);
  }
}

export const tafsirService = new TafsirService();
