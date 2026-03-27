import { useState, useCallback, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";

import { chapters } from "@/lib/quranMetadata";
import {
  getBookmarks,
  removeBookmark,
  updateBookmark,
  type Bookmark,
} from "@/lib/bookmarkService";
import PullToRefresh from "@/components/PullToRefresh";

interface BookmarksProps {
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings" | "bookmarks", verseNumber?: number) => void;
  activeTab?: "home" | "surah" | "settings" | "bookmarks";
}

export default function Bookmarks({ onNavigate, activeTab = "bookmarks" }: BookmarksProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [editingNote, setEditingNote] = useState<Bookmark | null>(null);
  const [noteText, setNoteText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const bm = await getBookmarks();
    setBookmarks(bm);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getChapterName = (chapterId: number) => {
    const ch = chapters.find((c) => c.id === chapterId);
    return ch ? ch.englishName : `Chapter ${chapterId}`;
  };

  const getChapterArabicName = (chapterId: number) => {
    const ch = chapters.find((c) => c.id === chapterId);
    return ch ? ch.arabicName.replace(/^سُورَةُ\s+/, '') : '';
  };

  const handleDelete = async (b: Bookmark) => {
    await removeBookmark(b.chapterId, b.verseNumber);
    await refresh();
  };

  const handleSaveNote = async () => {
    if (editingNote) {
      await updateBookmark(editingNote.chapterId, editingNote.verseNumber, { note: noteText });
      setEditingNote(null);
      setNoteText("");
      await refresh();
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-card">
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

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-nav-clearance min-h-0">
          <PullToRefresh onRefresh={refresh} scrollRef={scrollRef}>
          {bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <Icon icon="solar:bookmark-linear" className="size-8 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground text-sm" data-testid="text-empty-bookmarks">
                No bookmarks yet
              </p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Tap the bookmark icon on any verse to save it
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookmarks.map((b) => (
                <div
                  key={b.id}
                  className="bg-card/60 backdrop-blur-sm rounded-xl border border-border/30 overflow-hidden"
                  data-testid={`card-bookmark-${b.id}`}
                >
                  <button
                    onClick={() => onNavigate("chapter", b.chapterId, undefined, b.verseNumber)}
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
                      <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground/40 shrink-0" />
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
          </PullToRefresh>
        </div>
      </div>

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

    </div>
  );
}
