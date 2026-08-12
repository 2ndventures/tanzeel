import { useEffect, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { getDisplayArabicName, surahMeanings } from "@/lib/quranMetadata";
import { filterChapters } from "@/lib/surahSearch";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";

interface SurahPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentChapterId?: number;
  onSelect: (chapterId: number) => void;
}

export default function SurahPickerSheet({ open, onOpenChange, currentChapterId, onSelect }: SurahPickerSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const keyboardHeight = useKeyboardHeight();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset search each time the sheet opens and scroll the current surah into view
  useEffect(() => {
    if (!open) return;
    setSearchQuery("");
    const raf = requestAnimationFrame(() => {
      const el = listRef.current?.querySelector(`[data-chapter-id="${currentChapterId}"]`);
      el?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, currentChapterId]);

  const filtered = filterChapters(searchQuery);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[80vh] flex flex-col overflow-hidden rounded-t-3xl bg-screen-gradient"
        style={{
          backgroundColor: 'hsl(var(--sheet-bg))',
          borderColor: 'hsl(var(--sheet-muted))',
          bottom: keyboardHeight,
          maxHeight: keyboardHeight
            ? `calc(100vh - ${keyboardHeight}px - env(safe-area-inset-top, 0px))`
            : undefined,
          transition: 'bottom 0.25s ease-out',
        }}
      >
        <SheetHeader className="shrink-0 relative z-10">
          <SheetTitle className="text-xl font-semibold text-foreground">Select Surah</SheetTitle>
          <SheetDescription className="sr-only">Search and select a surah to play</SheetDescription>
        </SheetHeader>

        <div className="relative shrink-0 mt-2 mb-3 z-10">
          <label htmlFor="playbar-surah-search" className="sr-only">Search surahs</label>
          <Input
            ref={searchInputRef}
            id="playbar-surah-search"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            placeholder="Search surahs..."
            className="h-12 bg-card/80 border-0 rounded-2xl text-foreground placeholder:text-muted-foreground px-5 pr-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                searchInputRef.current?.blur();
              }
            }}
            data-testid="input-playbar-surah-search"
          />
          {searchQuery.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-muted/60 active:opacity-70 transition-colors"
              aria-label="Clear search"
              data-testid="button-playbar-surah-clear"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
          ) : (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 relative z-10 -mx-2 px-2"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No surahs match your search</p>
          )}
          <div className="space-y-0.5">
            {filtered.map((chapter) => {
              const isCurrent = chapter.id === currentChapterId;
              return (
                <button
                  key={chapter.id}
                  data-chapter-id={chapter.id}
                  onClick={() => {
                    onSelect(chapter.id);
                    onOpenChange(false);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-3 py-3 min-h-12 rounded-xl hover-elevate active-elevate-2 text-left"
                  data-testid={`playbar-surah-option-${chapter.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 shrink-0 text-sm tabular-nums text-muted-foreground text-right">{chapter.id}</span>
                    <div className="min-w-0">
                      <span className="flex items-center gap-2 text-base text-foreground/90">
                        <span className="truncate">{chapter.englishName}</span>
                        {isCurrent && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </span>
                      {surahMeanings[chapter.id] && (
                        <span className="block text-xs text-muted-foreground truncate">{surahMeanings[chapter.id]}</span>
                      )}
                    </div>
                  </div>
                  <span className="font-arabic text-lg text-muted-foreground shrink-0">{getDisplayArabicName(chapter.arabicName)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
