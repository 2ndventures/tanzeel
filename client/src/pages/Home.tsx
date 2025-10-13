import { useState } from "react";
import { Search, Menu, Settings as SettingsIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import ChapterCard from "@/components/ChapterCard";
import BottomNav from "@/components/BottomNav";
import { chapters } from "@/lib/quranData";

interface HomeProps {
  onNavigate: (page: string, chapterId?: number) => void;
}

export default function Home({ onNavigate }: HomeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredChapters = chapters.filter((chapter) =>
    chapter.arabicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chapter.englishName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button className="p-2 hover-elevate active-elevate-2 rounded-md" data-testid="button-menu">
            <Menu className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground" data-testid="text-title">Home</h1>
          <button 
            className="p-2 hover-elevate active-elevate-2 rounded-md" 
            data-testid="button-settings"
            onClick={() => onNavigate("settings")}
          >
            <SettingsIcon className="w-6 h-6 text-foreground" />
          </button>
        </div>
        
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for a chapter..."
              className="pl-10 bg-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {filteredChapters.map((chapter) => (
          <ChapterCard
            key={chapter.id}
            number={chapter.id}
            arabicName={chapter.arabicName}
            englishName={chapter.englishName}
            verseCount={chapter.verseCount}
            revelationType={chapter.revelationType}
            onClick={() => onNavigate("chapter", chapter.id)}
          />
        ))}
      </div>

      <BottomNav
        activeTab="home"
        onTabChange={(tab) => {
          if (tab === "settings") onNavigate("settings");
          if (tab === "surah") onNavigate("home");
        }}
      />
    </div>
  );
}
