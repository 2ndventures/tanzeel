import { Icon } from "@iconify/react";
import BottomNav from "@/components/BottomNav";

interface HomePageProps {
  onNavigate: (page: string, chapterId?: number, tab?: "home" | "surah" | "settings") => void;
  activeTab?: "home" | "surah" | "settings";
}

export default function HomePage({ onNavigate, activeTab = "home" }: HomePageProps) {
  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col items-center justify-center animate-fade-in relative overflow-hidden">
      <div className="absolute -top-20 -right-20 size-64 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 size-64 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-3xl" />
      
      <div className="flex flex-col items-center justify-center space-y-8 p-8 max-w-md w-full relative z-10">
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
          className="mt-8 px-10 py-4 bg-gradient-to-br from-primary to-primary/90 text-white rounded-3xl hover-elevate active-elevate-2 font-semibold text-lg shadow-xl shadow-primary/20 hover-lift transition-smooth"
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
