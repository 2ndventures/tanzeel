import { getItem, setItem } from './storage';

interface Bookmark {
  chapterId: number;
  verseNumber: number;
  timestamp: number;
}

const BOOKMARKS_KEY = 'quran_bookmarks';

export async function saveBookmark(chapterId: number, verseNumber: number): Promise<void> {
  const bookmarks = await getBookmarks();
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

  await setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export async function removeBookmark(chapterId: number, verseNumber: number): Promise<void> {
  const bookmarks = await getBookmarks();
  const filtered = bookmarks.filter(
    b => !(b.chapterId === chapterId && b.verseNumber === verseNumber)
  );
  await setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
}

export async function getBookmarks(): Promise<Bookmark[]> {
  const stored = await getItem(BOOKMARKS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export async function isBookmarked(chapterId: number, verseNumber: number): Promise<boolean> {
  const bookmarks = await getBookmarks();
  return bookmarks.some(
    b => b.chapterId === chapterId && b.verseNumber === verseNumber
  );
}

export async function getChapterBookmark(chapterId: number): Promise<number | null> {
  const bookmarks = (await getBookmarks())
    .filter(b => b.chapterId === chapterId)
    .sort((a, b) => b.timestamp - a.timestamp);
  
  return bookmarks[0]?.verseNumber || null;
}
