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
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);
  
  const filteredChapters = chapters.filter((chapter) =>
    chapter.arabicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chapter.englishName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20 animate-fade-in">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="flex items-center justify-between p-5">
          <div className="w-10"></div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight" data-testid="text-title">Explore Surahs</h1>
          <button 
            className="p-2.5 hover-elevate active-elevate-2 rounded-xl transition-smooth" 
            data-testid="button-settings"
            onClick={() => onNavigate("settings", undefined, "settings")}
          >
            <Icon icon="solar:settings-bold" className="w-6 h-6 text-foreground" />
          </button>
        </div>
        
        <div className="px-5 pb-5">
          <div className="relative">
            <Icon icon="solar:magnifer-bold" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search chapters..."
              className="pl-12 h-12 bg-card/50 border-border rounded-3xl shadow-sm transition-smooth focus:shadow-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </div>
      </header>

      <div className="p-5 space-y-3">
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
