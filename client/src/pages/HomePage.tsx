import { Search, Play } from "lucide-react";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { chapters } from "@/lib/quranData";
import { getReadingStats, formatReadingTime } from "@/lib/readingStats";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface HomePageProps {
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings") => void;
  activeTab?: "home" | "surah" | "settings";
}

const featuredSurahs = [
  { id: 1, meaning: "The Opening" },
  { id: 2, meaning: "The Cow" },
  { id: 3, meaning: "Family of Imran" },
];

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
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md w-full mx-auto px-5 pt-6 pb-4">
        {/* Header with greeting and search */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1" data-testid="text-greeting">
              As-Salamu<br />Alaykum
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-subtitle">
              Continue your spiritual journey
            </p>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            className="mt-1"
            data-testid="button-search"
            onClick={() => onNavigate("surah-juz", undefined, "surah")}
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {/* Reading Progress Card - Dark */}
        <Card className="bg-card-foreground dark:bg-card-foreground text-background dark:text-background p-5 mb-4" data-testid="card-reading-progress">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-background/20 dark:bg-background/20 rounded-lg flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-background dark:border-background rounded" />
              </div>
              <div>
                <p className="text-xs text-background/70 dark:text-background/70 mb-0.5" data-testid="text-progress-label">
                  Reading Progress
                </p>
                <p className="text-base font-semibold" data-testid="text-current-juz">
                  Juz 12
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold" data-testid="text-progress-percentage">
                47%
              </p>
              <p className="text-xs text-background/70 dark:text-background/70" data-testid="text-completed-label">
                Completed
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-5">
            <div className="h-1.5 bg-background/20 dark:bg-background/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-background dark:bg-background rounded-full transition-all duration-300"
                style={{ width: '47%' }}
                data-testid="progress-bar"
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center" data-testid="stat-day-streak">
              <p className="text-2xl font-bold mb-1">{stats.dayStreak}</p>
              <p className="text-xs text-background/70 dark:text-background/70">Days Streak</p>
            </div>
            <div className="text-center" data-testid="stat-pages-read">
              <p className="text-2xl font-bold mb-1">{stats.versesRead}</p>
              <p className="text-xs text-background/70 dark:text-background/70">Pages Read</p>
            </div>
            <div className="text-center" data-testid="stat-weekly-time">
              <p className="text-2xl font-bold mb-1">{formatReadingTime(stats.weeklyMinutes)}</p>
              <p className="text-xs text-background/70 dark:text-background/70">This Week</p>
            </div>
          </div>
        </Card>

        {/* Continue Reading Button */}
        <div className="flex gap-3 mb-6">
          <Button 
            className="flex-1 gap-2 h-12" 
            data-testid="button-continue-reading"
            onClick={() => onNavigate("chapter", 12)}
          >
            <Play className="h-4 w-4 fill-current" />
            Continue Reading
          </Button>
        </div>

        {/* Explore Surahs Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground" data-testid="text-explore-surahs">
              Explore Surahs
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary font-medium gap-1 h-auto px-2 py-1"
              data-testid="button-view-all"
              onClick={() => onNavigate("surah-juz", undefined, "surah")}
            >
              View All
              <span className="text-lg">›</span>
            </Button>
          </div>

          {/* Surah List */}
          <div className="space-y-3">
            {featuredSurahs.map((featured) => {
              const chapter = chapters.find(ch => ch.id === featured.id);
              if (!chapter) return null;

              return (
                <Card
                  key={chapter.id}
                  className="p-4 hover-elevate active-elevate-2 cursor-pointer transition-smooth"
                  data-testid={`card-surah-${chapter.id}`}
                  onClick={() => onNavigate("chapter", chapter.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Number Badge */}
                    <Badge 
                      variant="secondary" 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-semibold p-0"
                      data-testid={`badge-surah-number-${chapter.id}`}
                    >
                      {chapter.id}
                    </Badge>

                    {/* Surah Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1" data-testid={`text-surah-meta-${chapter.id}`}>
                        {chapter.verseCount} Verses · {chapter.revelationType === "Meccan" ? "Makkah" : "Madinah"}
                      </p>
                      <h3 className="text-base font-semibold text-foreground mb-0.5" data-testid={`text-surah-name-${chapter.id}`}>
                        {chapter.englishName}
                      </h3>
                      <p className="text-xl font-arabic text-foreground mb-1" data-testid={`text-surah-arabic-${chapter.id}`}>
                        {chapter.arabicName.replace('سُورَةُ ', '')}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-surah-meaning-${chapter.id}`}>
                        {featured.meaning}
                      </p>
                    </div>

                    {/* Play Icon */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full shrink-0"
                      data-testid={`button-play-surah-${chapter.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate("chapter", chapter.id);
                      }}
                    >
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                        <Play className="h-4 w-4 fill-current" />
                      </div>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
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
