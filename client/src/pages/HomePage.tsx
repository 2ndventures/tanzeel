import { BookOpen } from "lucide-react";
import BottomNav from "@/components/BottomNav";

interface HomePageProps {
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings") => void;
  activeTab?: "home" | "surah" | "settings";
}

export default function HomePage({ onNavigate, activeTab = "home" }: HomePageProps) {
  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center space-y-6 p-8">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-10 h-10 text-primary" />
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-app-title">
            Quran Reader
          </h1>
          <p className="text-muted-foreground" data-testid="text-app-subtitle">
            Read, Listen, and Reflect
          </p>
        </div>

        <button
          onClick={() => onNavigate("surah-juz", undefined, "surah")}
          className="mt-8 px-8 py-3 bg-primary text-primary-foreground rounded-lg hover-elevate active-elevate-2 font-medium"
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
