import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useAudio } from "@/contexts/AudioContext";
import { chapters, getDisplayArabicName } from "@/lib/quranMetadata";
import { triggerHaptic } from "@/lib/haptics";

interface MiniPlayerProps {
  onNavigateToChapter: (chapterId: number) => void;
  visible: boolean;
  hasBottomNav?: boolean;
}

export default function MiniPlayer({ onNavigateToChapter, visible, hasBottomNav = true }: MiniPlayerProps) {
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

  const hasAudioActivity = !!activeChapterId && (isPlaying || currentTime > 0 || isLoading);
  const shouldShow = hasAudioActivity && visible;

  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const lastChapterRef = useRef<{ id: number; englishName: string; arabicName: string } | null>(null);

  if (activeChapterId) {
    const ch = chapters.find(c => c.id === activeChapterId);
    if (ch) {
      lastChapterRef.current = { id: ch.id, englishName: ch.englishName, arabicName: ch.arabicName };
    }
  }

  useEffect(() => {
    if (shouldShow) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    } else {
      setAnimateIn(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [shouldShow]);

  useEffect(() => {
    if (shouldShow) {
      document.body.setAttribute('data-mini-player-visible', '');
    } else {
      document.body.removeAttribute('data-mini-player-visible');
    }
    return () => document.body.removeAttribute('data-mini-player-visible');
  }, [shouldShow]);

  useEffect(() => {
    if (!hasBottomNav) {
      document.body.setAttribute('data-no-bottom-nav', '');
    } else {
      document.body.removeAttribute('data-no-bottom-nav');
    }
    return () => document.body.removeAttribute('data-no-bottom-nav');
  }, [hasBottomNav]);

  if (!mounted || !lastChapterRef.current) return null;

  const chapter = lastChapterRef.current;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const arabicName = getDisplayArabicName(chapter.arabicName);

  return (
    <div
      className={`fixed left-0 right-0 z-50 transition-all duration-300 ease-out ${
        animateIn ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
      style={{ bottom: hasBottomNav ? 'calc(72px + env(safe-area-inset-bottom, 0px))' : 'env(safe-area-inset-bottom, 0px)' }}
      data-testid="mini-player"
    >
      <div className="mx-3 rounded-2xl bg-card/95 backdrop-blur-2xl shadow-lg ring-1 ring-border/40 overflow-hidden">
        <div className="h-[3px] bg-muted/30">
          <div
            className="h-full transition-all duration-200"
            style={{ backgroundColor: 'hsl(var(--glow-primary))', width: `${progress}%` }}
            data-testid="mini-player-progress"
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5">
          <button
            className="flex-1 min-w-0 flex items-center gap-3"
            onClick={() => {
              triggerHaptic('light');
              onNavigateToChapter(chapter.id);
            }}
            data-testid="mini-player-navigate"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--glow-primary)/0.15)]">
              <Icon icon="solar:book-2-bold" className="size-4" style={{ color: 'hsl(var(--glow-primary))' }} />
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

          <div className="waveform-bars shrink-0" data-testid="mini-player-waveform">
            {[
              { delay: '0s', duration: '0.7s', min: 0.2, max: 0.75 },
              { delay: '0.15s', duration: '0.55s', min: 0.3, max: 1.0 },
              { delay: '0.05s', duration: '0.8s', min: 0.15, max: 0.6 },
              { delay: '0.25s', duration: '0.6s', min: 0.25, max: 0.85 },
            ].map((bar, i) => (
              <div
                key={i}
                className={`waveform-bar ${isPlaying ? 'waveform-playing' : ''}`}
                style={{
                  '--wave-delay': bar.delay,
                  '--wave-duration': bar.duration,
                  '--wave-min': bar.min,
                  '--wave-max': bar.max,
                  transform: isPlaying ? undefined : 'scaleY(0.12)',
                  opacity: isPlaying ? 1 : 0.5,
                } as React.CSSProperties}
              />
            ))}
          </div>

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
