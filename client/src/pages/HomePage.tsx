import { BookOpen } from "lucide-react";
import BottomNav from "@/components/BottomNav";

interface HomePageProps {
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings") => void;
  activeTab?: "home" | "surah" | "settings";
}

export default function HomePage({ onNavigate, activeTab = "home" }: HomePageProps) {
  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col items-center justify-center animate-fade-in">
      <div className="flex flex-col items-center justify-center space-y-8 p-8 max-w-md w-full">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg animate-scale-in hover-lift">
          <BookOpen className="w-12 h-12 text-primary" />
        </div>
        
        <div className="text-center space-y-3 animate-fade-in-up">
          <h1 className="text-4xl font-bold text-foreground tracking-tight" data-testid="text-app-title">
            Quran Reader
          </h1>
          <p className="text-lg text-muted-foreground" data-testid="text-app-subtitle">
            Read, Listen, and Reflect
          </p>
        </div>

        <button
          onClick={() => onNavigate("surah-juz", undefined, "surah")}
          className="mt-8 px-10 py-4 bg-primary text-primary-foreground rounded-2xl hover-elevate active-elevate-2 font-semibold text-lg shadow-md hover-lift transition-smooth"
          data-testid="button-start-reading"
        >
          Start Reading
        </button>
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
