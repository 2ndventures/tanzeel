import { useEffect } from "react";
import { Icon } from "@iconify/react";
import { useAudio } from "@/contexts/AudioContext";
import { chapters, getDisplayArabicName } from "@/lib/quranMetadata";
import { triggerHaptic } from "@/lib/haptics";

interface MiniPlayerProps {
  onNavigateToChapter: (chapterId: number) => void;
  visible: boolean;
}

export default function MiniPlayer({ onNavigateToChapter, visible }: MiniPlayerProps) {
  const {
    activeChapterId,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    error,
    togglePlayPause,
    retry,
  } = useAudio();

  const showMiniPlayer = !!activeChapterId && visible;

  useEffect(() => {
    if (showMiniPlayer) {
      document.body.setAttribute('data-mini-player-visible', '');
    } else {
      document.body.removeAttribute('data-mini-player-visible');
    }
    return () => document.body.removeAttribute('data-mini-player-visible');
  }, [showMiniPlayer]);

  if (!showMiniPlayer) return null;

  const chapter = chapters.find(c => c.id === activeChapterId);
  if (!chapter) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const arabicName = getDisplayArabicName(chapter);

  return (
    <div
      className={`fixed left-0 right-0 z-30 transition-all duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
      style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
      data-testid="mini-player"
    >
      <div className="mx-3 rounded-2xl bg-card/95 backdrop-blur-2xl shadow-lg ring-1 ring-border/40 overflow-hidden">
        <div className="h-[3px] bg-muted/30">
          <div
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${progress}%` }}
            data-testid="mini-player-progress"
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5">
          <button
            className="flex-1 min-w-0 flex items-center gap-3"
            onClick={() => {
              triggerHaptic('light');
              onNavigateToChapter(activeChapterId);
            }}
            data-testid="mini-player-navigate"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Icon icon="solar:book-2-bold" className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold text-foreground truncate" data-testid="mini-player-title">
                {chapter.englishName}
              </p>
              <p className="text-[11px] text-muted-foreground font-arabic truncate" data-testid="mini-player-arabic">
                {arabicName}
              </p>
            </div>
          </button>

          <button
            className="flex size-10 shrink-0 items-center justify-center rounded-full active:scale-95 transition-transform disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              if (error) {
                retry();
              } else {
                togglePlayPause();
              }
            }}
            disabled={isLoading}
            aria-label={error ? "Retry audio" : isLoading ? "Loading audio" : isPlaying ? "Pause" : "Play"}
            data-testid="mini-player-play-pause"
          >
            {error ? (
              <Icon icon="solar:refresh-bold" className="size-5 text-destructive" />
            ) : isLoading ? (
              <div className="size-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Icon icon="solar:pause-bold" className="size-5 text-foreground" />
            ) : (
              <Icon icon="solar:play-bold" className="size-5 text-foreground ml-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
