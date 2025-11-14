import { Icon } from "@iconify/react";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { StatusBarShim } from "@/components/StatusBarShim";
import { chapters } from "@/lib/quranMetadata";
import { getReadingStats, formatReadingTime } from "@/lib/readingStats";
import { useCollapsibleHeader } from "@/hooks/useCollapsibleHeader";

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
    <div className="h-screen overflow-hidden bg-gradient-to-b from-background via-background/95 to-background">
      {/* Rich layered gradients for depth - outside scroll container */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/10 via-background/50 to-background/90 dark:from-indigo-900/30 dark:via-slate-900/50 dark:to-black/70 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-amber-500/8 via-transparent to-transparent dark:from-amber-500/10 pointer-events-none" />

      {/* Status Bar Shim */}
      <StatusBarShim />

      {/* Fixed Header - Non-collapsible */}
      <div className="fixed top-0 left-0 right-0 z-40">
        <div className="absolute inset-0 bg-card/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-border" />
        <div className="relative header-safe-padding">
          <div className="px-8 pt-4 pb-6">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  As-salamu alaykum
                </p>
                <h2 className="font-heading text-4xl font-black tracking-tighter text-foreground">
                  Simple Quran
                </h2>
              </div>
              <div className="relative size-16 flex items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-amber-500 shadow-lg ring-2 ring-border">
                <Icon icon="solar:book-bold" className="size-10 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div 
        className="relative h-full overflow-y-auto pt-[200px]"
        style={{
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <div className="relative px-8 space-y-6 pb-24">
        {/* Continue Reading Card - Multi-layer glass */}
        <div 
          className="relative group mb-6 overflow-hidden rounded-3xl p-[1px] shadow-xl hover-elevate active-elevate-2 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 transform-gpu"
          onClick={() => onNavigate("chapter", stats.lastReadChapter)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate("chapter", stats.lastReadChapter); }}}
          role="button"
          tabIndex={0}
          aria-label={`${stats.lastReadVerse > 0 ? 'Continue' : 'Start'} reading Surah ${currentChapter.englishName}, ${stats.lastReadVerse > 0 ? `at ayah ${stats.lastReadVerse} of ${currentChapter.verseCount}, ${progress}% complete` : `${currentChapter.verseCount} ayahs`}`}
          data-testid="card-continue-reading"
        >
          {/* Gradient border */}
          <div className="absolute inset-0 bg-gradient-to-br from-border via-border/50 to-border rounded-3xl" />
          {/* Inner glass panel */}
          <div className="relative overflow-hidden rounded-3xl bg-card/80 dark:bg-slate-900/60 p-8 backdrop-blur-sm" style={{contain: 'paint'}}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-3xl" />
            <div className="relative mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stats.lastReadVerse > 0 ? 'Continue Reading' : 'Start Reading'}</p>
                <h3 className="mt-2 font-heading text-3xl font-bold tracking-tighter text-foreground">
                  Surah {currentChapter.englishName}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {stats.lastReadVerse > 0 ? `Ayah ${stats.lastReadVerse} of ${currentChapter.verseCount}` : `${currentChapter.verseCount} Ayahs`}
                </p>
              </div>
              <Icon icon="solar:book-2-bold" className="size-14 text-foreground/10" />
            </div>
            <div className="mb-4 h-3 overflow-hidden rounded-full bg-muted/50 shadow-inner ring-1 ring-border">
              <div
                style={{ width: `${progress}%` }}
                className="h-full rounded-full bg-gradient-to-r from-primary via-amber-500 to-primary shadow-md"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress}% Complete</span>
              <span>{stats.lastReadVerse > 0 ? `${versesLeft} Ayahs left` : `Ready to start`}</span>
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <div className="mb-6">
          <h3 className="mb-6 text-sm font-bold tracking-wider text-muted-foreground uppercase">
            QUICK ACCESS
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div 
              className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg hover-elevate active-elevate-2 cursor-pointer group focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 transform-gpu"
              onClick={() => onNavigate("surah-juz", undefined, "surah")}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate("surah-juz", undefined, "surah"); }}}
              role="button"
              tabIndex={0}
              aria-label="Browse all surahs"
              data-testid="button-bookmarks"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-border to-transparent rounded-3xl" />
              <div className="relative flex flex-col items-center justify-center rounded-3xl bg-card/80 dark:bg-slate-900/70 p-6 backdrop-blur-sm" style={{contain: 'paint'}}>
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/20 shadow-md shadow-inner ring-1 ring-border">
                  <Icon icon="solar:bookmark-bold" className="size-7 text-primary" />
                </div>
                <span className="text-xs font-semibold text-foreground">Surahs</span>
              </div>
            </div>
            <div 
              className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg hover-elevate active-elevate-2 cursor-pointer group focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 transform-gpu"
              onClick={() => onNavigate("surah-juz", undefined, "surah")}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate("surah-juz", undefined, "surah"); }}}
              role="button"
              tabIndex={0}
              aria-label="View favorites"
              data-testid="button-favorites"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-border to-transparent rounded-3xl" />
              <div className="relative flex flex-col items-center justify-center rounded-3xl bg-card/80 dark:bg-slate-900/70 p-6 backdrop-blur-sm" style={{contain: 'paint'}}>
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-amber-500/20 shadow-md shadow-inner ring-1 ring-border">
                  <Icon icon="solar:star-bold" className="size-7 text-amber-500" />
                </div>
                <span className="text-xs font-semibold text-foreground">Favorites</span>
              </div>
            </div>
            <div 
              className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg hover-elevate active-elevate-2 cursor-pointer group focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 transform-gpu"
              onClick={() => onNavigate("settings", undefined, "settings")}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate("settings", undefined, "settings"); }}}
              role="button"
              tabIndex={0}
              aria-label="Open settings"
              data-testid="button-settings"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-border to-transparent rounded-3xl" />
              <div className="relative flex flex-col items-center justify-center rounded-3xl bg-card/80 dark:bg-slate-900/70 p-6 backdrop-blur-sm" style={{contain: 'paint'}}>
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/20 shadow-md shadow-inner ring-1 ring-border">
                  <Icon icon="solar:settings-bold" className="size-7 text-primary" />
                </div>
                <span className="text-xs font-semibold text-foreground">Settings</span>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Reading */}
        <div className="pb-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">
              SURAH OF THE DAY
            </h3>
            <Icon icon="solar:alt-arrow-right-bold" className="size-5 text-primary" />
          </div>
          <div 
            className="relative group overflow-hidden rounded-3xl p-[1px] shadow-2xl hover-elevate cursor-pointer transform-gpu"
            onClick={() => onNavigate("chapter", 55)}
            data-testid="card-todays-reading"
          >
            {/* Gradient border */}
            <div className="absolute inset-0 bg-gradient-to-br from-border via-border/50 to-border rounded-3xl" />
            {/* Inner glass panel */}
            <div className="relative overflow-hidden rounded-3xl bg-card/80 dark:bg-slate-900/70 p-6 backdrop-blur-sm" style={{contain: 'paint'}}>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h4 className="font-heading text-2xl font-bold tracking-tighter text-foreground">
                    Surah Ar-Rahman
                  </h4>
                  <p className="mt-2 text-sm text-muted-foreground">The Most Merciful • 78 Ayahs</p>
                </div>
                <div className="rounded-2xl bg-primary/25 px-4 py-2 shadow-md shadow-inner ring-1 ring-border">
                  <span className="text-sm font-bold text-primary">55</span>
                </div>
              </div>
              <div className="rounded-2xl bg-muted/30 dark:bg-black/40 p-6 border border-border ring-1 ring-border/50">
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
