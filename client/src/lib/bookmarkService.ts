import { getItem, setItem } from './storage';

export interface Bookmark {
  id: string;
  chapterId: number;
  verseNumber: number;
  folder: string;
  note: string;
  createdAt: number;
  updatedAt: number;
  userId: string | null;
}

const STORAGE_KEY = 'quran_bookmarks';
const FOLDERS_KEY = 'quran_bookmark_folders';
const DEFAULT_FOLDER = 'Favorites';
const MIGRATION_KEY = '__bookmarks_updatedAt_migration_done';
const MIGRATION_KEY_USER_ID = '__bookmarks_userId_migration_done';

async function loadBookmarks(): Promise<Bookmark[]> {
  try {
    const raw = await getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  await setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

export async function getBookmarks(): Promise<Bookmark[]> {
  return (await loadBookmarks()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getBookmarksByFolder(folder: string): Promise<Bookmark[]> {
  return (await getBookmarks()).filter((b) => b.folder === folder);
}

export async function isBookmarked(chapterId: number, verseNumber: number): Promise<boolean> {
  return (await loadBookmarks()).some(
    (b) => b.chapterId === chapterId && b.verseNumber === verseNumber
  );
}

export async function getBookmark(chapterId: number, verseNumber: number): Promise<Bookmark | undefined> {
  return (await loadBookmarks()).find(
    (b) => b.chapterId === chapterId && b.verseNumber === verseNumber
  );
}

export async function addBookmark(
  chapterId: number,
  verseNumber: number,
  folder: string = DEFAULT_FOLDER,
  note: string = ''
): Promise<Bookmark> {
  const bookmarks = await loadBookmarks();
  const existing = bookmarks.find(
    (b) => b.chapterId === chapterId && b.verseNumber === verseNumber
  );
  if (existing) return existing;

  const now = Date.now();
  const bookmark: Bookmark = {
    id: `${chapterId}:${verseNumber}`,
    chapterId,
    verseNumber,
    folder,
    note,
    createdAt: now,
    updatedAt: now,
    userId: null,
  };
  bookmarks.push(bookmark);
  await saveBookmarks(bookmarks);
  await addFolder(folder);
  return bookmark;
}

export async function removeBookmark(chapterId: number, verseNumber: number): Promise<void> {
  const bookmarks = (await loadBookmarks()).filter(
    (b) => !(b.chapterId === chapterId && b.verseNumber === verseNumber)
  );
  await saveBookmarks(bookmarks);
}

export async function updateBookmark(
  chapterId: number,
  verseNumber: number,
  updates: { folder?: string; note?: string }
): Promise<void> {
  const bookmarks = await loadBookmarks();
  const idx = bookmarks.findIndex(
    (b) => b.chapterId === chapterId && b.verseNumber === verseNumber
  );
  if (idx >= 0) {
    if (updates.folder !== undefined) {
      bookmarks[idx].folder = updates.folder;
      await addFolder(updates.folder);
    }
    if (updates.note !== undefined) bookmarks[idx].note = updates.note;
    bookmarks[idx].updatedAt = Date.now();
    await saveBookmarks(bookmarks);
  }
}

export async function getFolders(): Promise<string[]> {
  try {
    const raw = await getItem(FOLDERS_KEY);
    const folders: string[] = raw ? JSON.parse(raw) : [DEFAULT_FOLDER];
    if (!folders.includes(DEFAULT_FOLDER)) folders.unshift(DEFAULT_FOLDER);
    return folders;
  } catch {
    return [DEFAULT_FOLDER];
  }
}

export async function addFolder(name: string): Promise<boolean> {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const folders = await getFolders();
  if (folders.some((f) => f.toLowerCase() === trimmed.toLowerCase())) return false;
  folders.push(trimmed);
  await setItem(FOLDERS_KEY, JSON.stringify(folders));
  return true;
}

export async function removeFolder(name: string): Promise<void> {
  if (name === DEFAULT_FOLDER) return;
  const folders = (await getFolders()).filter((f) => f !== name);
  await setItem(FOLDERS_KEY, JSON.stringify(folders));
  const now = Date.now();
  const bookmarks = (await loadBookmarks()).map((b) =>
    b.folder === name ? { ...b, folder: DEFAULT_FOLDER, updatedAt: now } : b
  );
  await saveBookmarks(bookmarks);
}

export async function renameFolder(oldName: string, newName: string): Promise<boolean> {
  const trimmed = newName.trim();
  if (oldName === DEFAULT_FOLDER || !trimmed) return false;
  const existing = await getFolders();
  if (existing.some((f) => f.toLowerCase() === trimmed.toLowerCase() && f !== oldName)) return false;
  const folders = existing.map((f) => (f === oldName ? trimmed : f));
  await setItem(FOLDERS_KEY, JSON.stringify(folders));
  const now = Date.now();
  const bookmarks = (await loadBookmarks()).map((b) =>
    b.folder === oldName ? { ...b, folder: trimmed, updatedAt: now } : b
  );
  await saveBookmarks(bookmarks);
  return true;
}

export async function migrateUpdatedAt(): Promise<void> {
  try {
    const done = await getItem(MIGRATION_KEY);
    if (done) return;
    const bookmarks = await loadBookmarks();
    const migrated = bookmarks.map((b) =>
      b.updatedAt == null ? { ...b, updatedAt: b.createdAt } : b
    );
    await saveBookmarks(migrated);
    await setItem(MIGRATION_KEY, '1');
  } catch {
    // Non-fatal — next load will retry
  }
}

export async function migrateUserId(): Promise<void> {
  try {
    const done = await getItem(MIGRATION_KEY_USER_ID);
    if (done) return;
    const raw: any[] = JSON.parse((await getItem(STORAGE_KEY)) ?? '[]');
    const migrated = raw.map((b) =>
      !('userId' in b) ? { ...b, userId: null } : b
    );
    await saveBookmarks(migrated);
    await setItem(MIGRATION_KEY_USER_ID, '1');
  } catch {
    // Non-fatal — next load will retry
  }
}
