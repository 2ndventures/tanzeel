import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ChapterCard from "@/components/ChapterCard";
import BottomNav from "@/components/BottomNav";
import { StatusBarShim } from "@/components/StatusBarShim";
import { useCollapsibleHeader } from "@/hooks/useCollapsibleHeader";
import { chapters, juzData } from "@/lib/quranMetadata";
import { Settings } from "lucide-react";

interface SurahJuzProps {
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings") => void;
  activeTab?: "home" | "surah" | "settings";
}

export default function SurahJuz({ onNavigate, activeTab = "surah" }: SurahJuzProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<"surah" | "juz">("surah");
  const { isCollapsed, scrollContainerRef } = useCollapsibleHeader();
  
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background/95 to-background pb-24">
      {/* Rich layered gradients for depth - adapts to theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/50 to-background/90 dark:from-indigo-900/30 dark:via-slate-900/50 dark:to-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-amber-500/8 via-transparent to-transparent dark:from-amber-500/10" />
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20 dark:to-black/30" />

      {/* Status Bar Shim */}
      <StatusBarShim />

      {/* Fixed Title Header - Always visible */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border header-safe-padding">
        <div className="px-8 pt-4 pb-6">
          <div className="flex items-center justify-between">
            <h1 className="font-heading text-5xl font-black tracking-tighter text-foreground">
              Surahs
            </h1>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => onNavigate("settings", undefined, "settings")}
              className="size-14 rounded-full"
              aria-label="Open settings"
              data-testid="button-settings"
            >
              <Settings className="w-10 h-10" aria-hidden="true" style={{ width: '40px', height: '40px' }} />
            </Button>
          </div>
        </div>
      </div>

      {/* Collapsible Search & Tabs Section */}
      <div 
        className={`fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border transition-all duration-300 ${
          isCollapsed ? '' : 'collapsible-top-100'
        }`}
        style={{
          top: isCollapsed ? '-200px' : undefined,
        }}
      >
        <div className="px-8 pt-6 pb-6 space-y-6">
          {/* Search Bar - Glass */}
          <div className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-border to-transparent rounded-3xl" />
            <div className="relative">
              <label htmlFor="surah-search" className="sr-only">Search surahs by name or number</label>
              <Input
                id="surah-search"
                type="search"
                placeholder="Search by name or number..."
                className="h-14 bg-card/80 dark:bg-slate-900/60 backdrop-blur-xl border-0 rounded-3xl text-foreground placeholder:text-muted-foreground px-6"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search surahs by name or number"
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

      {/* Scrollable Content */}
      <div 
        ref={scrollContainerRef}
        className={`relative h-screen overflow-y-auto transition-[padding] duration-300 ${
          isCollapsed ? 'scroll-pt-140-safe' : 'scroll-pt-340-safe'
        }`}
      >

        {/* Chapter / Juz List */}
        <div className="px-8 space-y-3 pb-8">
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
          ) : mode === "juz" ? (
            juzData.map((juz, index) => {
              const startChapter = chapters.find(ch => ch.id === juz.startChapter);
              const endChapter = chapters.find(ch => ch.id === juz.endChapter);
              return (
                <div
                  key={juz.id}
                  className="relative overflow-hidden rounded-3xl p-[1px] shadow-lg hover-elevate active-elevate-2 cursor-pointer transform-gpu animate-fadeInUp"
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => onNavigate("chapter", juz.startChapter)}
                  data-testid={`juz-card-${juz.id}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-border to-transparent rounded-3xl" />
                  <div className="relative flex items-center gap-4 rounded-3xl bg-card/80 dark:bg-slate-900/60 p-5 backdrop-blur-sm">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/20 shadow-inner ring-1 ring-border">
                      <span className="text-lg font-bold text-primary">{juz.id}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading text-lg font-bold tracking-tight text-foreground">
                        Juz {juz.id}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {startChapter?.englishName} {juz.startVerse > 1 ? `(${juz.startVerse})` : ''} — {endChapter?.englishName}
                      </p>
                    </div>
                    <Icon icon="solar:alt-arrow-right-bold" className="size-5 text-muted-foreground shrink-0" />
                  </div>
                </div>
              );
            })
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
