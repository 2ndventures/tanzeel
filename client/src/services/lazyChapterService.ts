import { Verse } from '@/lib/quranMetadata';

interface ChapterContent {
  id: number;
  verses: Verse[];
}

class LazyChapterService {
  private cache: Map<number, ChapterContent> = new Map();
  private loadingPromises: Map<number, Promise<ChapterContent>> = new Map();

  async getChapter(chapterId: number): Promise<ChapterContent> {
    // Return from cache if available
    if (this.cache.has(chapterId)) {
      return this.cache.get(chapterId)!;
    }

    // Return existing loading promise if chapter is currently being loaded
    if (this.loadingPromises.has(chapterId)) {
      return this.loadingPromises.get(chapterId)!;
    }

    // Start loading the chapter
    const loadPromise = this.loadChapter(chapterId);
    this.loadingPromises.set(chapterId, loadPromise);

    try {
      const chapter = await loadPromise;
      this.cache.set(chapterId, chapter);
      return chapter;
    } finally {
      this.loadingPromises.delete(chapterId);
    }
  }

  private async loadChapter(chapterId: number): Promise<ChapterContent> {
    // Use relative URL which works in both dev and Capacitor
    const url = `/data/chapters/${chapterId}.json`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load chapter ${chapterId}: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getVerse(chapterId: number, verseNumber: number): Promise<Verse | null> {
    const chapter = await this.getChapter(chapterId);
    return chapter.verses.find(v => v.number === verseNumber) || null;
  }

  async getVerses(chapterId: number): Promise<Verse[]> {
    const chapter = await this.getChapter(chapterId);
    return chapter.verses;
  }

  // Preload a chapter in the background (doesn't wait for result)
  preloadChapter(chapterId: number): void {
    if (!this.cache.has(chapterId) && !this.loadingPromises.has(chapterId)) {
      this.getChapter(chapterId).catch(err => {
        console.warn(`Failed to preload chapter ${chapterId}:`, err);
      });
    }
  }

  // Clear cache for memory management (optional, can be used if needed)
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache size for debugging
  getCacheSize(): number {
    return this.cache.size;
  }

  // Check if chapter is cached
  isCached(chapterId: number): boolean {
    return this.cache.has(chapterId);
  }
}

// Export singleton instance
export const lazyChapterService = new LazyChapterService();
