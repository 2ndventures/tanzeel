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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950">
      {/* Rich layered gradients for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-slate-900/50 to-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />

      {/* Main Content */}
      <div className="relative px-8 pb-24 pt-8">
        {/* Profile Section */}
        <div className="flex items-center justify-between py-6">
          <div>
            <p className="text-sm text-gray-400">As-salamu alaykum</p>
            <h2 className="font-heading text-4xl font-black tracking-tighter text-white" style={{textShadow: '0 4px 12px rgba(0,0,0,0.5)'}}>
              Ahmad
            </h2>
          </div>
          <div className="relative size-16 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-amber-500 shadow-[0_8px_32px_rgba(0,0,0,0.6)] ring-2 ring-white/10">
            <img
              alt="Profile"
              src="https://randomuser.me/api/portraits/men/32.jpg"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Continue Reading Card - Multi-layer glass */}
        <div className="relative group mb-6 overflow-hidden rounded-3xl p-[1px] shadow-2xl shadow-[0_12px_48px_rgba(0,0,0,0.7)]">
          {/* Gradient border */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/10 rounded-3xl" />
          {/* Inner glass panel */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-900/60 p-8 backdrop-blur-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 rounded-3xl" />
            <div className="relative mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Continue Reading</p>
                <h3 className="mt-2 font-heading text-3xl font-bold tracking-tighter text-white" style={{textShadow: '0 4px 12px rgba(0,0,0,0.5)'}}>
                  Surah Al-Baqarah
                </h3>
                <p className="mt-2 text-sm text-gray-500">Ayah 156 of 286</p>
              </div>
              <Icon icon="solar:book-2-bold" className="size-14 text-white/10" />
            </div>
            <div className="mb-4 h-3 overflow-hidden rounded-full bg-black/40 shadow-inner ring-1 ring-white/5">
              <div
                style={{ width: "54%" }}
                className="h-full rounded-full bg-gradient-to-r from-primary via-amber-500 to-primary shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>54% Complete</span>
              <span>130 Ayahs left</span>
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <div className="mb-6">
          <h3 className="mb-6 text-sm font-bold tracking-wider text-gray-400 uppercase" style={{textShadow: '0 2px 8px rgba(0,0,0,0.4)'}}>
            QUICK ACCESS
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div 
              className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover-elevate cursor-pointer group"
              onClick={() => onNavigate("surah-juz", undefined, "surah")}
              data-testid="button-bookmarks"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl" />
              <div className="relative flex flex-col items-center justify-center rounded-3xl bg-slate-900/70 p-6 backdrop-blur-xl">
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/20 shadow-[0_4px_16px_rgba(0,0,0,0.6)] shadow-inner ring-1 ring-white/10">
                  <Icon icon="solar:bookmark-bold" className="size-7 text-primary" style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}} />
                </div>
                <span className="text-xs font-semibold text-white">Bookmarks</span>
              </div>
            </div>
            <div 
              className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover-elevate cursor-pointer group"
              onClick={() => onNavigate("surah-juz", undefined, "surah")}
              data-testid="button-favorites"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl" />
              <div className="relative flex flex-col items-center justify-center rounded-3xl bg-slate-900/70 p-6 backdrop-blur-xl">
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-amber-500/20 shadow-[0_4px_16px_rgba(0,0,0,0.6)] shadow-inner ring-1 ring-white/10">
                  <Icon icon="solar:star-bold" className="size-7 text-amber-500" style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}} />
                </div>
                <span className="text-xs font-semibold text-white">Favorites</span>
              </div>
            </div>
            <div 
              className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover-elevate cursor-pointer group"
              onClick={() => onNavigate("surah-juz", undefined, "surah")}
              data-testid="button-history"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl" />
              <div className="relative flex flex-col items-center justify-center rounded-3xl bg-slate-900/70 p-6 backdrop-blur-xl">
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/20 shadow-[0_4px_16px_rgba(0,0,0,0.6)] shadow-inner ring-1 ring-white/10">
                  <Icon icon="solar:history-bold" className="size-7 text-primary" style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}} />
                </div>
                <span className="text-xs font-semibold text-white">History</span>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Reading */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase" style={{textShadow: '0 2px 8px rgba(0,0,0,0.4)'}}>
              TODAY'S READING
            </h3>
            <Icon icon="solar:alt-arrow-right-bold" className="size-5 text-primary" style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}} />
          </div>
          <div 
            className="relative group overflow-hidden rounded-3xl p-[1px] shadow-2xl shadow-[0_12px_48px_rgba(0,0,0,0.7)] hover-elevate cursor-pointer"
            onClick={() => onNavigate("chapter", 55)}
            data-testid="card-todays-reading"
          >
            {/* Gradient border */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/10 rounded-3xl" />
            {/* Inner glass panel */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900/70 p-6 backdrop-blur-2xl">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h4 className="font-heading text-2xl font-bold tracking-tighter text-white" style={{textShadow: '0 4px 12px rgba(0,0,0,0.5)'}}>
                    Surah Ar-Rahman
                  </h4>
                  <p className="mt-2 text-sm text-gray-400">The Most Merciful • 78 Ayahs</p>
                </div>
                <div className="rounded-2xl bg-primary/25 px-4 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.6)] shadow-inner ring-1 ring-white/10">
                  <span className="text-sm font-bold text-primary" style={{textShadow: '0 2px 6px rgba(0,0,0,0.5)'}}>55</span>
                </div>
              </div>
              <div className="rounded-2xl bg-black/40 p-6 border border-white/5 ring-1 ring-white/5">
                <p className="text-center font-arabic text-3xl leading-relaxed text-white" style={{textShadow: '0 2px 8px rgba(0,0,0,0.4)'}}>
                  فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ
                </p>
                <p className="mt-4 text-center text-sm italic text-gray-400">
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
