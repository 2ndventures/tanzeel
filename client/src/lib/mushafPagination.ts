import { Verse } from "@/lib/quranMetadata";

export interface MushafPage {
  pageIndex: number;
  verses: Verse[];
  estimatedLineCount: number;
}

/**
 * Estimate the number of display lines a verse will occupy.
 * ~8 Arabic words per line is a reasonable heuristic for Mushaf-style layout.
 */
function estimateLineCount(arabicText: string): number {
  // Strip HTML tags (for tajweed script which contains <span> markup)
  const plainText = arabicText.replace(/<[^>]+>/g, "");
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 8));
}

/**
 * Greedily paginate verses into pages of ~targetLines lines each.
 * A single verse is never split across pages — if it exceeds the target it gets its own page.
 */
export function paginateVerses(
  verses: Verse[],
  targetLines = 15
): MushafPage[] {
  if (verses.length === 0) return [];

  const pages: MushafPage[] = [];
  let currentVerses: Verse[] = [];
  let currentLineCount = 0;

  for (const verse of verses) {
    const lines = estimateLineCount(verse.arabicText);

    // If adding this verse would exceed target and we already have content, start a new page
    if (currentLineCount + lines > targetLines && currentVerses.length > 0) {
      pages.push({
        pageIndex: pages.length,
        verses: currentVerses,
        estimatedLineCount: currentLineCount,
      });
      currentVerses = [];
      currentLineCount = 0;
    }

    currentVerses.push(verse);
    currentLineCount += lines;
  }

  // Push the last page
  if (currentVerses.length > 0) {
    pages.push({
      pageIndex: pages.length,
      verses: currentVerses,
      estimatedLineCount: currentLineCount,
    });
  }

  return pages;
}

/**
 * Find which page contains a given verse number.
 * Returns 0 if not found (safe fallback to first page).
 */
export function getPageIndexForVerse(
  pages: MushafPage[],
  verseNumber: number
): number {
  for (const page of pages) {
    if (page.verses.some((v) => v.number === verseNumber)) {
      return page.pageIndex;
    }
  }
  return 0;
}
