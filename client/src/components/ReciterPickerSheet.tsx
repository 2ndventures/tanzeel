import { useEffect } from "react";
import { Check, Loader2, Pause, Play } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { getAllReciters, getFeaturedReciters, type Reciter } from "@/lib/reciters";
import { useReciterPreview } from "@/hooks/useReciterPreview";

interface ReciterPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentReciterId: string;
  onSelect: (reciterId: string) => void;
  /** Pauses main playback while a preview clip plays. */
  pauseMainAudio: () => void;
}

export default function ReciterPickerSheet({ open, onOpenChange, currentReciterId, onSelect, pauseMainAudio }: ReciterPickerSheetProps) {
  const {
    previewingReciter,
    previewProgress,
    previewLoading,
    previewError,
    startPreview,
    stopPreview,
  } = useReciterPreview({ pauseMainAudio });

  useEffect(() => {
    if (!open) stopPreview();
  }, [open, stopPreview]);

  const featured = getFeaturedReciters();
  const featuredIds = new Set(featured.map((r) => r.id));
  const others = getAllReciters().filter((r) => !featuredIds.has(r.id));

  const renderReciter = (r: Reciter) => {
    const isSelected = currentReciterId === r.id;
    const isPreviewing = previewingReciter === r.id;
    const isLoadingPreview = isPreviewing && previewLoading;

    return (
      <div key={r.id} className="flex items-center gap-2 rounded-md" data-testid={`playbar-reciter-option-${r.id}`}>
        <button
          onClick={() => {
            stopPreview();
            onSelect(r.id);
            onOpenChange(false);
          }}
          className="flex-1 flex items-center gap-2 px-3 py-3 min-h-12 hover-elevate active-elevate-2 rounded-xl min-w-0 text-left"
          data-testid={`playbar-reciter-select-${r.id}`}
        >
          <div className="flex flex-col items-start min-w-0 flex-1 w-full">
            <span className="w-full text-base text-foreground/90 flex items-center gap-2 min-w-0">
              <span className="truncate min-w-0 flex-1">{r.name}{r.style ? ` (${r.style})` : ''}</span>
              {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
            </span>
            <span className="w-full text-sm text-muted-foreground truncate">{r.arabicName}</span>
          </div>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isPreviewing && !isLoadingPreview) {
              stopPreview();
            } else {
              startPreview(r.id);
            }
          }}
          className="relative flex items-center justify-center size-11 shrink-0 mr-1 rounded-full"
          aria-label={isPreviewing ? `Stop preview for ${r.name}` : `Preview ${r.name}`}
          data-testid={`playbar-reciter-preview-${r.id}`}
        >
          {isPreviewing && !isLoadingPreview && (
            <svg className="absolute inset-0 w-11 h-11 -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="none" stroke="hsl(var(--sheet-muted))" strokeWidth="2.5" />
              <circle
                cx="22" cy="22" r="18"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - previewProgress)}`}
                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
              />
            </svg>
          )}
          {isLoadingPreview ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : isPreviewing ? (
            <Pause className="w-4 h-4 text-primary" />
          ) : (
            <Play className="w-4 h-4 text-muted-foreground ml-0.5" />
          )}
        </button>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[80vh] flex flex-col overflow-hidden rounded-t-3xl bg-screen-gradient"
        style={{ backgroundColor: 'hsl(var(--sheet-bg))', borderColor: 'hsl(var(--sheet-muted))' }}
      >
        <SheetHeader className="shrink-0 relative z-10">
          <SheetTitle className="text-xl font-semibold text-foreground">Select Reciter</SheetTitle>
          <SheetDescription className="sr-only">Choose a reciter for playback; tap the play icon to hear a preview</SheetDescription>
        </SheetHeader>

        <div
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 relative z-10 mt-2 -mx-2 px-2"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {previewError && (
            <p className="text-center text-xs text-destructive py-1">{previewError}</p>
          )}
          <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide px-3 pt-1 pb-2">Featured</h3>
          <div className="space-y-0.5">{featured.map(renderReciter)}</div>
          {others.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground/70 uppercase tracking-wide px-3 pt-4 pb-2">All Reciters</h3>
              <div className="space-y-0.5">{others.map(renderReciter)}</div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
