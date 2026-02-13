import { Icon } from "@iconify/react";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { StatusBarShim } from "@/components/StatusBarShim";
import { chapters } from "@/lib/quranMetadata";
import { getReadingStats } from "@/lib/readingStats";

interface HomePageProps {
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings") => void;
  activeTab?: "home" | "surah" | "settings";
}

export default function HomePage({ onNavigate, activeTab = "home" }: HomePageProps) {
  const [stats, setStats] = useState(() => getReadingStats());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setStats(getReadingStats());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Get current chapter data from stats
  const currentChapter = chapters.find(ch => ch.id === stats.lastReadChapter) || chapters[0];

  // Calculate progress with guards against undefined/NaN and clamp to 0-100
  const rawProgress = stats.lastReadVerse && currentChapter.verseCount > 0
    ? (stats.lastReadVerse / currentChapter.verseCount) * 100
    : 0;
  const progress = Math.max(0, Math.min(100, Math.round(rawProgress)));
  const versesLeft = Math.max(0, currentChapter.verseCount - (stats.lastReadVerse || 0));

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-b from-background to-card">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50 pointer-events-none" />

      {/* Status Bar Shim */}
      <StatusBarShim />

      {/* Content - fills viewport between header and bottom nav */}
      <div className="relative flex flex-col h-full pb-20">
        {/* Header */}
        <div className="px-8 py-6 header-safe-padding">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">As-salamu alaykum</p>
              <h2 className="font-heading text-4xl font-black tracking-tighter text-foreground">
                Simple Quran
              </h2>
            </div>
            <div className="relative size-16 flex items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent shadow-[0_0_20px_rgba(255,214,10,0.3)]">
              <Icon icon="solar:book-bold" className="size-8 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Main content area - flex to fill */}
        <div className="flex flex-col flex-1 px-8 gap-6 min-h-0">
          {/* Continue Reading Card */}
          <div
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/5 p-8 shadow-lg shadow-[0_0_30px_rgba(255,214,10,0.2)] backdrop-blur-sm cursor-pointer flex-1 flex flex-col justify-center"
            onClick={() => onNavigate("chapter", stats.lastReadChapter)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate("chapter", stats.lastReadChapter); }}}
            role="button"
            tabIndex={0}
            aria-label={`${stats.lastReadVerse > 0 ? 'Continue' : 'Start'} reading Surah ${currentChapter.englishName}, ${stats.lastReadVerse > 0 ? `at ayah ${stats.lastReadVerse} of ${currentChapter.verseCount}, ${progress}% complete` : `${currentChapter.verseCount} ayahs`}`}
            data-testid="card-continue-reading"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl" />
            <div className="relative mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/70">{stats.lastReadVerse > 0 ? 'Continue Reading' : 'Start Reading'}</p>
                <h3 className="mt-2 font-heading text-3xl font-bold tracking-tighter text-foreground">
                  Surah {currentChapter.englishName}
                </h3>
                <p className="mt-2 text-sm text-foreground/60">
                  {stats.lastReadVerse > 0 ? `Ayah ${stats.lastReadVerse} of ${currentChapter.verseCount}` : `${currentChapter.verseCount} Ayahs`}
                </p>
              </div>
              <Icon icon="solar:book-2-bold" className="size-14 text-foreground/20" />
            </div>
            <div className="mb-4 h-3 overflow-hidden rounded-full bg-foreground/10">
              <div
                style={{ width: `${progress}%` }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary shadow-inner"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-foreground/60">
              <span>{progress}% Complete</span>
              <span>{stats.lastReadVerse > 0 ? `${versesLeft} Ayahs left` : `Ready to start`}</span>
            </div>
          </div>

          {/* Quick Access */}
          <div>
            <h3 className="mb-6 text-sm font-bold tracking-wider text-muted-foreground uppercase">
              QUICK ACCESS
            </h3>
            <div className="grid grid-cols-3 gap-6">
              <div
                className="flex flex-col items-center justify-center rounded-3xl bg-card/80 p-6 shadow-lg backdrop-blur-sm border border-border/50 cursor-pointer"
                onClick={() => onNavigate("surah-juz", undefined, "surah")}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate("surah-juz", undefined, "surah"); }}}
                role="button"
                tabIndex={0}
                aria-label="Browse all surahs"
                data-testid="button-bookmarks"
              >
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/20 shadow-inner">
                  <Icon icon="solar:bookmark-bold" className="size-7 text-primary" />
                </div>
                <span className="text-xs font-semibold text-foreground">Surahs</span>
              </div>
              <div
                className="flex flex-col items-center justify-center rounded-3xl bg-card/80 p-6 shadow-lg backdrop-blur-sm border border-border/50 cursor-pointer"
                onClick={() => onNavigate("surah-juz", undefined, "surah")}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate("surah-juz", undefined, "surah"); }}}
                role="button"
                tabIndex={0}
                aria-label="View favorites"
                data-testid="button-favorites"
              >
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-secondary/20 shadow-inner">
                  <Icon icon="solar:star-bold" className="size-7 text-secondary" />
                </div>
                <span className="text-xs font-semibold text-foreground">Favorites</span>
              </div>
              <div
                className="flex flex-col items-center justify-center rounded-3xl bg-card/80 p-6 shadow-lg backdrop-blur-sm border border-border/50 cursor-pointer"
                onClick={() => onNavigate("settings", undefined, "settings")}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate("settings", undefined, "settings"); }}}
                role="button"
                tabIndex={0}
                aria-label="Open settings"
                data-testid="button-settings"
              >
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-accent/20 shadow-inner">
                  <Icon icon="solar:settings-bold" className="size-7 text-accent" />
                </div>
                <span className="text-xs font-semibold text-foreground">Settings</span>
              </div>
            </div>
          </div>

          {/* Today's Reading */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">
                TODAY'S READING
              </h3>
              <Icon icon="solar:alt-arrow-right-bold" className="size-5 text-primary" />
            </div>
            <div
              className="rounded-3xl border border-border/50 bg-card/80 p-6 shadow-lg backdrop-blur-sm cursor-pointer flex-1 flex flex-col justify-center"
              onClick={() => onNavigate("chapter", 55)}
              data-testid="card-todays-reading"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h4 className="font-heading text-2xl font-bold tracking-tighter text-foreground">
                    Surah Ar-Rahman
                  </h4>
                  <p className="mt-2 text-sm text-muted-foreground">The Most Merciful • 78 Ayahs</p>
                </div>
                <div className="rounded-2xl bg-primary/20 px-4 py-2 shadow-inner">
                  <span className="text-sm font-bold text-primary">55</span>
                </div>
              </div>
              <div className="rounded-2xl bg-muted/10 p-6 border border-border/30">
                <p className="text-center font-arabic text-3xl leading-relaxed text-foreground">
                  فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ
                </p>
                <p className="mt-4 text-center text-sm italic text-muted-foreground">
                  Then which of the favors of your Lord will you deny?
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === "settings") {
            onNavigate("settings", undefined, "settings");
          } else if (tab === "surah") {
            onNavigate("surah-juz", undefined, "surah");
          } else {
            onNavigate("home", undefined, "home");
          }
        }}
      />
    </div>
  );
}
