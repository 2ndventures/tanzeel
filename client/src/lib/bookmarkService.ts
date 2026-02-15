export interface Bookmark {
  id: string;
  chapterId: number;
  verseNumber: number;
  folder: string;
  note: string;
  createdAt: number;
}

const STORAGE_KEY = 'quran_bookmarks';
const FOLDERS_KEY = 'quran_bookmark_folders';
const DEFAULT_FOLDER = 'Favorites';

function loadBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: Bookmark[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

export function getBookmarks(): Bookmark[] {
  return loadBookmarks().sort((a, b) => b.createdAt - a.createdAt);
}

export function getBookmarksByFolder(folder: string): Bookmark[] {
  return getBookmarks().filter((b) => b.folder === folder);
}

export function isBookmarked(chapterId: number, verseNumber: number): boolean {
  return loadBookmarks().some(
    (b) => b.chapterId === chapterId && b.verseNumber === verseNumber
  );
}

export function getBookmark(chapterId: number, verseNumber: number): Bookmark | undefined {
  return loadBookmarks().find(
    (b) => b.chapterId === chapterId && b.verseNumber === verseNumber
  );
}

export function addBookmark(
  chapterId: number,
  verseNumber: number,
  folder: string = DEFAULT_FOLDER,
  note: string = ''
): Bookmark {
  const bookmarks = loadBookmarks();
  const existing = bookmarks.find(
    (b) => b.chapterId === chapterId && b.verseNumber === verseNumber
  );
  if (existing) return existing;

  const bookmark: Bookmark = {
    id: `${chapterId}:${verseNumber}`,
    chapterId,
    verseNumber,
    folder,
    note,
    createdAt: Date.now(),
  };
  bookmarks.push(bookmark);
  saveBookmarks(bookmarks);
  addFolder(folder);
  return bookmark;
}

export function removeBookmark(chapterId: number, verseNumber: number) {
  const bookmarks = loadBookmarks().filter(
    (b) => !(b.chapterId === chapterId && b.verseNumber === verseNumber)
  );
  saveBookmarks(bookmarks);
}

export function updateBookmark(
  chapterId: number,
  verseNumber: number,
  updates: { folder?: string; note?: string }
) {
  const bookmarks = loadBookmarks();
  const idx = bookmarks.findIndex(
    (b) => b.chapterId === chapterId && b.verseNumber === verseNumber
  );
  if (idx >= 0) {
    if (updates.folder !== undefined) {
      bookmarks[idx].folder = updates.folder;
      addFolder(updates.folder);
    }
    if (updates.note !== undefined) bookmarks[idx].note = updates.note;
    saveBookmarks(bookmarks);
  }
}

export function getFolders(): string[] {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    const folders: string[] = raw ? JSON.parse(raw) : [DEFAULT_FOLDER];
    if (!folders.includes(DEFAULT_FOLDER)) folders.unshift(DEFAULT_FOLDER);
    return folders;
  } catch {
    return [DEFAULT_FOLDER];
  }
}

export function addFolder(name: string) {
  const folders = getFolders();
  if (!folders.includes(name)) {
    folders.push(name);
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  }
}

export function removeFolder(name: string) {
  if (name === DEFAULT_FOLDER) return;
  const folders = getFolders().filter((f) => f !== name);
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  const bookmarks = loadBookmarks().map((b) =>
    b.folder === name ? { ...b, folder: DEFAULT_FOLDER } : b
  );
  saveBookmarks(bookmarks);
}

export function renameFolder(oldName: string, newName: string) {
  if (oldName === DEFAULT_FOLDER || !newName.trim()) return;
  const folders = getFolders().map((f) => (f === oldName ? newName : f));
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  const bookmarks = loadBookmarks().map((b) =>
    b.folder === oldName ? { ...b, folder: newName } : b
  );
  saveBookmarks(bookmarks);
}
