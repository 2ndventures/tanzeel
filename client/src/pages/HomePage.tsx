import { Icon } from "@iconify/react";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { chapters } from "@/lib/quranData";
import { getReadingStats, formatReadingTime } from "@/lib/readingStats";

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background to-card">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
      
      {/* Status Bar */}
      <div className="relative flex items-center justify-between px-8 py-4">
        <span className="text-sm font-semibold text-foreground">9:41</span>
        <div className="flex items-center gap-1">
          <Icon icon="solar:signal-bold" className="size-4 text-foreground" />
          <Icon icon="solar:wifi-router-bold" className="size-4 text-foreground" />
          <Icon icon="solar:battery-charge-bold" className="size-4 text-foreground" />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative px-8 pb-24">
        {/* Profile Section */}
        <div className="flex items-center justify-between py-6">
          <div>
            <p className="text-sm text-muted-foreground">As-salamu alaykum</p>
            <h2 className="font-heading text-4xl font-black tracking-tighter text-foreground">
              Ahmad
            </h2>
          </div>
          <div className="relative size-16 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent shadow-[0_0_20px_rgba(255,214,10,0.3)]">
            <img
              alt="Profile"
              src="https://randomuser.me/api/portraits/men/32.jpg"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Continue Reading Card */}
        <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/5 p-8 shadow-lg shadow-[0_0_30px_rgba(255,214,10,0.2)] backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl" />
          <div className="relative mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/70">Continue Reading</p>
              <h3 className="mt-2 font-heading text-3xl font-bold tracking-tighter text-foreground">
                Surah Al-Baqarah
              </h3>
              <p className="mt-2 text-sm text-foreground/60">Ayah 156 of 286</p>
            </div>
            <Icon icon="solar:book-2-bold" className="size-14 text-foreground/20" />
          </div>
          <div className="mb-4 h-3 overflow-hidden rounded-full bg-foreground/10">
            <div
              style={{ width: "54%" }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary shadow-inner"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span>54% Complete</span>
            <span>130 Ayahs left</span>
          </div>
        </div>

        {/* Quick Access */}
        <div className="mb-6">
          <h3 className="mb-6 text-sm font-bold tracking-wider text-muted-foreground uppercase">
            QUICK ACCESS
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div 
              className="flex flex-col items-center justify-center rounded-3xl bg-card/80 p-6 shadow-lg backdrop-blur-sm border border-border/50 hover-elevate cursor-pointer"
              onClick={() => onNavigate("surah-juz", undefined, "surah")}
              data-testid="button-bookmarks"
            >
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/20 shadow-inner">
                <Icon icon="solar:bookmark-bold" className="size-7 text-primary" />
              </div>
              <span className="text-xs font-semibold text-foreground">Bookmarks</span>
            </div>
            <div 
              className="flex flex-col items-center justify-center rounded-3xl bg-card/80 p-6 shadow-lg backdrop-blur-sm border border-border/50 hover-elevate cursor-pointer"
              onClick={() => onNavigate("surah-juz", undefined, "surah")}
              data-testid="button-favorites"
            >
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-secondary/20 shadow-inner">
                <Icon icon="solar:star-bold" className="size-7 text-secondary" />
              </div>
              <span className="text-xs font-semibold text-foreground">Favorites</span>
            </div>
            <div 
              className="flex flex-col items-center justify-center rounded-3xl bg-card/80 p-6 shadow-lg backdrop-blur-sm border border-border/50 hover-elevate cursor-pointer"
              onClick={() => onNavigate("surah-juz", undefined, "surah")}
              data-testid="button-history"
            >
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-accent/20 shadow-inner">
                <Icon icon="solar:history-bold" className="size-7 text-accent" />
              </div>
              <span className="text-xs font-semibold text-foreground">History</span>
            </div>
          </div>
        </div>

        {/* Today's Reading */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">
              TODAY'S READING
            </h3>
            <Icon icon="solar:alt-arrow-right-bold" className="size-5 text-primary" />
          </div>
          <div 
            className="rounded-3xl border border-border/50 bg-card/80 p-6 shadow-lg backdrop-blur-sm hover-elevate cursor-pointer"
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
