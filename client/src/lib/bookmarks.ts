import { getItem, setItem } from './storage';

interface Bookmark {
  chapterId: number;
  verseNumber: number;
  timestamp: number;
}

const BOOKMARKS_KEY = 'quran_bookmarks';

export function saveBookmark(chapterId: number, verseNumber: number): void {
  const bookmarks = getBookmarks();
  const existingIndex = bookmarks.findIndex(
    b => b.chapterId === chapterId && b.verseNumber === verseNumber
  );

  if (existingIndex >= 0) {
    bookmarks[existingIndex].timestamp = Date.now();
  } else {
    bookmarks.push({
      chapterId,
      verseNumber,
      timestamp: Date.now(),
    });
  }

  setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export function removeBookmark(chapterId: number, verseNumber: number): void {
  const bookmarks = getBookmarks();
  const filtered = bookmarks.filter(
    b => !(b.chapterId === chapterId && b.verseNumber === verseNumber)
  );
  setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
}

export function getBookmarks(): Bookmark[] {
  const stored = getItem(BOOKMARKS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function isBookmarked(chapterId: number, verseNumber: number): boolean {
  const bookmarks = getBookmarks();
  return bookmarks.some(
    b => b.chapterId === chapterId && b.verseNumber === verseNumber
  );
}

export function getChapterBookmark(chapterId: number): number | null {
  const bookmarks = getBookmarks()
    .filter(b => b.chapterId === chapterId)
    .sort((a, b) => b.timestamp - a.timestamp);
  
  return bookmarks[0]?.verseNumber || null;
}
