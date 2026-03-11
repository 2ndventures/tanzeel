import { useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import BottomNav from "@/components/BottomNav";
import { chapters } from "@/lib/quranMetadata";
import {
  getBookmarks,
  getBookmarksByFolder,
  getFolders,
  removeBookmark,
  addFolder,
  removeFolder,
  renameFolder,
  updateBookmark,
  type Bookmark,
} from "@/lib/bookmarkService";

interface BookmarksProps {
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings" | "bookmarks") => void;
  activeTab?: "home" | "surah" | "settings" | "bookmarks";
}

export default function Bookmarks({ onNavigate, activeTab = "bookmarks" }: BookmarksProps) {
  const [folders, setFolders] = useState(() => getFolders());
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState(() => getBookmarks());
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [movingBookmark, setMovingBookmark] = useState<Bookmark | null>(null);
  const [editingNote, setEditingNote] = useState<Bookmark | null>(null);
  const [noteText, setNoteText] = useState("");

  const refresh = useCallback(() => {
    setBookmarks(getBookmarks());
    setFolders(getFolders());
  }, []);

  const displayBookmarks = selectedFolder
    ? getBookmarksByFolder(selectedFolder)
    : bookmarks;

  const getChapterName = (chapterId: number) => {
    const ch = chapters.find((c) => c.id === chapterId);
    return ch ? ch.englishName : `Chapter ${chapterId}`;
  };

  const getChapterArabicName = (chapterId: number) => {
    const ch = chapters.find((c) => c.id === chapterId);
    return ch ? ch.arabicName.replace(/^سُورَةُ\s+/, '') : '';
  };

  const handleDelete = (b: Bookmark) => {
    removeBookmark(b.chapterId, b.verseNumber);
    refresh();
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim());
      setNewFolderName("");
      setShowNewFolder(false);
      refresh();
    }
  };

  const handleRenameFolder = () => {
    if (editingFolder && editFolderName.trim()) {
      renameFolder(editingFolder, editFolderName.trim());
      if (selectedFolder === editingFolder) setSelectedFolder(editFolderName.trim());
      setEditingFolder(null);
      setEditFolderName("");
      refresh();
    }
  };

  const handleDeleteFolder = (folder: string) => {
    removeFolder(folder);
    if (selectedFolder === folder) setSelectedFolder(null);
    refresh();
  };

  const handleMoveBookmark = (b: Bookmark, toFolder: string) => {
    updateBookmark(b.chapterId, b.verseNumber, { folder: toFolder });
    setMovingBookmark(null);
    refresh();
  };

  const handleSaveNote = () => {
    if (editingNote) {
      updateBookmark(editingNote.chapterId, editingNote.verseNumber, { note: noteText });
      setEditingNote(null);
      setNoteText("");
      refresh();
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const folderBookmarkCounts = folders.reduce<Record<string, number>>((acc, f) => {
    acc[f] = getBookmarksByFolder(f).length;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-background to-card">
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50 pointer-events-none" />

      <div className="relative flex flex-col flex-1 min-h-0">
        <div className="header-safe-padding shrink-0">
          <div className="px-8 py-6">
            <h2 className="font-heading text-5xl font-black tracking-tighter text-foreground" data-testid="text-bookmarks-title">
              Bookmarks
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {bookmarks.length} saved {bookmarks.length === 1 ? 'verse' : 'verses'}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedFolder(null)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedFolder === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground'
              }`}
              data-testid="button-folder-all"
            >
              All
            </button>
            {folders.map((folder) => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder === selectedFolder ? null : folder)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  selectedFolder === folder
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground'
                }`}
                data-testid={`button-folder-${folder}`}
              >
                <span>{folder}</span>
                <span className="text-xs opacity-70">({folderBookmarkCounts[folder] || 0})</span>
              </button>
            ))}
            <button
              onClick={() => setShowNewFolder(true)}
              className="shrink-0 px-3 py-2 rounded-full text-sm font-medium bg-muted/30 text-muted-foreground transition-colors flex items-center gap-1"
              data-testid="button-add-folder"
            >
              <Icon icon="solar:add-circle-linear" className="size-4" />
              <span>New</span>
            </button>
          </div>

          {selectedFolder && selectedFolder !== 'Favorites' && (
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => {
                  setEditingFolder(selectedFolder);
                  setEditFolderName(selectedFolder);
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-muted/30"
                data-testid="button-rename-folder"
              >
                <Icon icon="solar:pen-linear" className="size-3" />
                Rename
              </button>
              <button
                onClick={() => handleDeleteFolder(selectedFolder)}
                className="flex items-center gap-1 text-xs text-destructive px-3 py-1.5 rounded-full bg-destructive/10"
                data-testid="button-delete-folder"
              >
                <Icon icon="solar:trash-bin-minimalistic-linear" className="size-3" />
                Delete
              </button>
            </div>
          )}

          {showNewFolder && (
            <div className="flex items-center gap-2 mb-4 bg-card/60 backdrop-blur-sm rounded-xl p-3 border border-border/30">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                data-testid="input-new-folder"
              />
              <button
                onClick={handleCreateFolder}
                className="text-primary text-sm font-medium px-3 py-1"
                data-testid="button-save-folder"
              >
                Save
              </button>
              <button
                onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
                className="text-muted-foreground text-sm px-2 py-1"
                data-testid="button-cancel-folder"
              >
                Cancel
              </button>
            </div>
          )}

          {editingFolder && (
            <div className="flex items-center gap-2 mb-4 bg-card/60 backdrop-blur-sm rounded-xl p-3 border border-border/30">
              <input
                type="text"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                placeholder="New folder name"
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
                data-testid="input-rename-folder"
              />
              <button
                onClick={handleRenameFolder}
                className="text-primary text-sm font-medium px-3 py-1"
                data-testid="button-save-rename"
              >
                Save
              </button>
              <button
                onClick={() => { setEditingFolder(null); setEditFolderName(""); }}
                className="text-muted-foreground text-sm px-2 py-1"
                data-testid="button-cancel-rename"
              >
                Cancel
              </button>
            </div>
          )}

          {displayBookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <Icon icon="solar:bookmark-linear" className="size-8 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground text-sm">
                {selectedFolder ? `No bookmarks in "${selectedFolder}"` : 'No bookmarks yet'}
              </p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Tap the bookmark icon on any verse to save it
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayBookmarks.map((b) => (
                <div
                  key={b.id}
                  className="bg-card/60 backdrop-blur-sm rounded-xl border border-border/30 overflow-hidden"
                  data-testid={`card-bookmark-${b.id}`}
                >
                  <button
                    onClick={() => onNavigate("chapter", b.chapterId)}
                    className="w-full text-left px-4 py-3 hover-elevate active-elevate-2"
                    data-testid={`button-goto-${b.id}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {getChapterName(b.chapterId)}
                          </span>
                          <span className="text-xs text-muted-foreground font-arabic">
                            {getChapterArabicName(b.chapterId)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            Verse {b.verseNumber}
                          </span>
                          <span className="text-xs text-muted-foreground/50">
                            {formatDate(b.createdAt)}
                          </span>
                        </div>
                        {b.note && (
                          <p className="text-xs text-muted-foreground/80 mt-1 truncate italic">
                            {b.note}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground/40 bg-muted/30 px-2 py-0.5 rounded-full">
                          {b.folder}
                        </span>
                        <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground/40" />
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-0 border-t border-border/20 px-1">
                    <button
                      onClick={() => {
                        setEditingNote(b);
                        setNoteText(b.note);
                      }}
                      className="flex items-center gap-1 text-xs text-muted-foreground px-3 py-2 hover-elevate rounded-lg"
                      data-testid={`button-note-${b.id}`}
                    >
                      <Icon icon="solar:notes-linear" className="size-3.5" />
                      Note
                    </button>
                    <button
                      onClick={() => setMovingBookmark(b)}
                      className="flex items-center gap-1 text-xs text-muted-foreground px-3 py-2 hover-elevate rounded-lg"
                      data-testid={`button-move-${b.id}`}
                    >
                      <Icon icon="solar:folder-with-files-linear" className="size-3.5" />
                      Move
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleDelete(b)}
                      className="flex items-center gap-1 text-xs text-destructive/70 px-3 py-2 hover-elevate rounded-lg"
                      data-testid={`button-remove-${b.id}`}
                    >
                      <Icon icon="solar:trash-bin-minimalistic-linear" className="size-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {movingBookmark && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setMovingBookmark(null)}>
          <div
            className="w-full max-w-lg bg-card rounded-t-2xl p-5 safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-foreground mb-1">Move to folder</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {getChapterName(movingBookmark.chapterId)} : Verse {movingBookmark.verseNumber}
            </p>
            <div className="space-y-1">
              {folders.map((folder) => (
                <button
                  key={folder}
                  onClick={() => handleMoveBookmark(movingBookmark, folder)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between ${
                    movingBookmark.folder === folder
                      ? 'bg-primary/10 text-primary'
                      : 'hover-elevate text-foreground'
                  }`}
                  data-testid={`button-moveto-${folder}`}
                >
                  <span>{folder}</span>
                  {movingBookmark.folder === folder && (
                    <Icon icon="solar:check-circle-bold" className="size-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {editingNote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setEditingNote(null)}>
          <div
            className="w-full max-w-lg bg-card rounded-t-2xl p-5 safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-foreground mb-1">Add a note</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {getChapterName(editingNote.chapterId)} : Verse {editingNote.verseNumber}
            </p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your note here..."
              className="w-full bg-muted/30 rounded-xl p-3 text-sm text-foreground outline-none resize-none border border-border/30 focus:border-primary/50"
              rows={3}
              autoFocus
              data-testid="input-note"
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                onClick={() => { setEditingNote(null); setNoteText(""); }}
                className="text-sm text-muted-foreground px-4 py-2"
                data-testid="button-cancel-note"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="text-sm font-medium text-primary-foreground bg-primary px-4 py-2 rounded-full"
                data-testid="button-save-note"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav activeTab={activeTab} onTabChange={(tab) => {
        if (tab === "home") onNavigate("home", undefined, "home");
        else if (tab === "surah") onNavigate("surah-juz", undefined, "surah");
        else if (tab === "bookmarks") onNavigate("bookmarks", undefined, "bookmarks");
        else if (tab === "settings") onNavigate("settings", undefined, "settings");
      }} />
    </div>
  );
}
