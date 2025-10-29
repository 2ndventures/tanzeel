import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ChapterCard from "@/components/ChapterCard";
import BottomNav from "@/components/BottomNav";
import { chapters } from "@/lib/quranData";

interface SurahJuzProps {
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings") => void;
  activeTab?: "home" | "surah" | "settings";
}

export default function SurahJuz({ onNavigate, activeTab = "surah" }: SurahJuzProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"surah" | "juz">("surah");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);
  
  // Normalize search text for better matching
  const normalizeSearch = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      // Remove common prefixes
      .replace(/^(al-|ar-|as-|an-|at-|az-)/i, '')
      // Normalize double vowels to single (aa->a, ee->e, etc.)
      .replace(/aa/g, 'a')
      .replace(/ee/g, 'e')
      .replace(/ii/g, 'i')
      .replace(/oo/g, 'o')
      .replace(/uu/g, 'u')
      // Remove hyphens and apostrophes
      .replace(/[-']/g, '');
  };

  const filteredChapters = chapters.filter((chapter) => {
    const query = searchQuery.toLowerCase().trim();
    const englishName = chapter.englishName.toLowerCase();
    const arabicName = chapter.arabicName.toLowerCase();
    
    // Direct match
    if (englishName.includes(query) || arabicName.includes(query) || chapter.id.toString().includes(query)) {
      return true;
    }
    
    // Normalized match for transliteration variations
    const normalizedQuery = normalizeSearch(query);
    const normalizedEnglish = normalizeSearch(englishName);
    
    if (normalizedEnglish.includes(normalizedQuery)) {
      return true;
    }
    
    // Also try with/without 'h' at the end
    if (normalizedQuery.endsWith('h')) {
      const withoutH = normalizedQuery.slice(0, -1);
      if (normalizedEnglish.includes(withoutH)) {
        return true;
      }
    } else {
      const withH = normalizedQuery + 'h';
      if (normalizedEnglish.includes(withH)) {
        return true;
      }
    }
    
    return false;
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 pb-24">
      {/* Rich layered gradients for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-slate-900/50 to-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />

      {/* Header */}
      <div className="relative px-8 pt-8 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-5xl font-black tracking-tighter text-white" style={{textShadow: '0 4px 16px rgba(0,0,0,0.6)'}}>
            Surahs
          </h1>
          <button 
            className="flex size-14 items-center justify-center rounded-full bg-primary/20 ring-1 ring-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover-elevate" 
            data-testid="button-search"
          >
            <Icon icon="solar:magnifer-bold" className="size-6 text-primary" style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}} />
          </button>
        </div>
        
        {/* Search Bar - Glass */}
        <div className="relative mb-6 overflow-hidden rounded-3xl p-[1px] shadow-lg shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl" />
          <div className="relative">
            <Input
              type="search"
              placeholder="Search by name or number..."
              className="h-14 bg-slate-900/60 backdrop-blur-xl border-0 rounded-3xl text-white placeholder:text-gray-500 px-6"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Mode Toggle - Glass */}
        <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl" />
          <div className="relative flex gap-2 p-1 bg-slate-900/60 backdrop-blur-xl rounded-3xl">
            <button
              onClick={() => setMode("surah")}
              className={`flex-1 py-3 rounded-3xl font-semibold text-sm transition-all ${
                mode === "surah"
                  ? "bg-primary text-black shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
                  : "text-gray-400"
              }`}
              data-testid="button-mode-surah"
            >
              All Surahs
            </button>
            <button
              onClick={() => setMode("juz")}
              className={`flex-1 py-3 rounded-3xl font-semibold text-sm transition-all ${
                mode === "juz"
                  ? "bg-primary text-black shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
                  : "text-gray-400"
              }`}
              data-testid="button-mode-juz"
            >
              Juz
            </button>
          </div>
        </div>
      </div>

      {/* Chapter List */}
      <div className="relative px-8 space-y-3">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 p-5">
              <Skeleton className="w-14 h-14 rounded-3xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="w-5 h-5 rounded" />
            </div>
          ))
        ) : filteredChapters.length > 0 ? (
          filteredChapters.map((chapter, index) => (
            <ChapterCard
              key={chapter.id}
              number={chapter.id}
              arabicName={chapter.arabicName}
              englishName={chapter.englishName}
              verseCount={chapter.verseCount}
              revelationType={chapter.revelationType}
              onClick={() => onNavigate("chapter", chapter.id)}
              style={{ animationDelay: `${index * 30}ms` }}
              isFirst={index === 0}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No chapters found</p>
          </div>
        )}
      </div>

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
