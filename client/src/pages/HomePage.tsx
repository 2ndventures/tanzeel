import { Icon } from "@iconify/react";
import BottomNav from "@/components/BottomNav";
import { chapters } from "@/lib/quranData";

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
  return (
    <div className="min-h-screen bg-background pb-32 animate-fade-in relative">
      <div className="absolute -top-20 -right-20 size-64 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 size-64 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="flex flex-col items-center justify-center space-y-8 p-8 pt-16 max-w-md w-full mx-auto">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg animate-scale-in hover-lift">
            <Icon icon="solar:book-bold" className="w-12 h-12 text-primary" />
          </div>
          
          <div className="text-center space-y-3 animate-fade-in-up">
            <h1 className="text-4xl font-bold text-foreground tracking-tight" data-testid="text-app-title">
              As-Salamu<br />Alaykum
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-app-subtitle">
              Continue your spiritual journey
            </p>
          </div>

          <button
            onClick={() => onNavigate("surah-juz", undefined, "surah")}
            className="mt-4 px-10 py-4 min-h-[56px] bg-gradient-to-br from-primary to-primary/90 text-white rounded-3xl hover-elevate active-elevate-2 font-semibold text-lg shadow-xl shadow-primary/20 hover-lift transition-smooth"
            data-testid="button-start-reading"
          >
            Start Reading
          </button>
        </div>

        <div className="px-5 mt-12 max-w-md w-full mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground" data-testid="text-explore-surahs">
              Explore Surahs
            </h2>
            <button
              onClick={() => onNavigate("surah-juz", undefined, "surah")}
              className="text-primary font-medium text-sm hover-elevate active-elevate-2 px-3 py-2 rounded-lg min-h-[44px] flex items-center gap-1"
              data-testid="button-view-all"
            >
              View All
              <Icon icon="solar:alt-arrow-right-bold" className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {featuredSurahs.map((featured) => {
              const chapter = chapters.find(ch => ch.id === featured.id);
              if (!chapter) return null;

              return (
                <button
                  key={chapter.id}
                  onClick={() => onNavigate("chapter", chapter.id)}
                  className="w-full bg-card hover-elevate active-elevate-2 rounded-3xl shadow-xl p-5 text-left transition-smooth min-h-[120px] flex items-center gap-4"
                  data-testid={`card-featured-surah-${chapter.id}`}
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">{chapter.id}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">
                        {chapter.verseCount} Verses · {chapter.revelationType === "Meccan" ? "Makkah" : "Madinah"}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1" data-testid={`text-surah-name-${chapter.id}`}>
                      {chapter.englishName}
                    </h3>
                    <p className="text-xl font-arabic text-foreground mb-1" data-testid={`text-surah-arabic-${chapter.id}`}>
                      {chapter.arabicName.replace('سُورَةُ ', '')}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-surah-meaning-${chapter.id}`}>
                      {featured.meaning}
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon icon="solar:play-bold" className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </button>
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
