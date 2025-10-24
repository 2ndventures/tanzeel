import { Home, Book, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: "home" | "surah" | "settings";
  onTabChange: (tab: "home" | "surah" | "settings") => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "home" as const, icon: Home, label: "Home" },
    { id: "surah" as const, icon: Book, label: "Surah/Juz" },
    { id: "settings" as const, icon: Settings, label: "Settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border shadow-lg">
      <div className="flex items-center justify-around gap-2 max-w-md mx-auto px-4 py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-4 gap-1.5 flex-1 rounded-2xl transition-smooth",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover-elevate active-elevate-2"
              )}
              data-testid={`button-nav-${tab.id}`}
            >
              <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
              <span className="text-xs font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
