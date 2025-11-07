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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background/95 to-background pb-24 safe-area-pad">
      {/* Rich layered gradients for depth - adapts to theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/50 to-background/90 dark:from-indigo-900/30 dark:via-slate-900/50 dark:to-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-amber-500/8 via-transparent to-transparent dark:from-amber-500/10" />
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20 dark:to-black/30" />

      {/* Sticky Header - background extends into safe area */}
      <header className="sticky top-0 z-10">
        <div className="relative overflow-hidden shadow-xl">
          {/* Glass background - extends to very top */}
          <div className="absolute inset-0 bg-card/80 dark:bg-slate-900/80 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          
          {/* Content has safe-area padding */}
          <div className="relative px-8 py-6 safe-area-top">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-heading text-5xl font-black tracking-tighter text-foreground" style={{textShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
                Surahs
              </h1>
              <div className="relative size-16 flex items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-amber-500 shadow-lg ring-2 ring-border" data-testid="avatar-profile">
                <Icon icon="solar:book-bold" className="size-10 text-primary-foreground" style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'}} />
              </div>
            </div>
        
        {/* Search Bar - Glass */}
        <div className="relative mb-6 overflow-hidden rounded-3xl p-[1px] shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-border to-transparent rounded-3xl" />
          <div className="relative">
            <Input
              type="search"
              placeholder="Search by name or number..."
              className="h-14 bg-card/80 dark:bg-slate-900/60 backdrop-blur-xl border-0 rounded-3xl text-foreground placeholder:text-muted-foreground px-6"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Mode Toggle - Glass */}
        <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-border to-transparent rounded-3xl" />
          <div className="relative flex gap-2 p-1 bg-card/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl">
            <button
              onClick={() => setMode("surah")}
              className={`flex-1 py-3 rounded-3xl font-semibold text-sm transition-all ${
                mode === "surah"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground"
              }`}
              data-testid="button-mode-surah"
            >
              All Surahs
            </button>
            <button
              onClick={() => setMode("juz")}
              className={`flex-1 py-3 rounded-3xl font-semibold text-sm transition-all ${
                mode === "juz"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground"
              }`}
              data-testid="button-mode-juz"
            >
              Juz
            </button>
          </div>
        </div>
          </div>
        </div>
      </header>

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
            <p className="text-muted-foreground text-lg">No chapters found</p>
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
