import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";

interface BottomNavProps {
  activeTab: "home" | "surah" | "settings" | "bookmarks";
  onTabChange: (tab: "home" | "surah" | "settings" | "bookmarks") => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "home" as const, icon: "solar:home-2-bold", label: "Home" },
    { id: "surah" as const, icon: "solar:book-bold", label: "Surahs" },
    { id: "bookmarks" as const, icon: "solar:bookmark-bold", label: "Bookmarks" },
    { id: "settings" as const, icon: "solar:settings-bold", label: "Settings" },
  ];

  return (
    <div className="border-t border-border bg-card/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl safe-area-bottom shrink-0">
      <div className="flex items-center justify-around px-4 py-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => { triggerHaptic('light'); onTabChange(tab.id); }}
              className="flex flex-col items-center gap-1.5 min-h-[48px] min-w-[48px] justify-center hover-elevate active-elevate-2 rounded-lg px-2"
              data-testid={`button-nav-${tab.id}`}
            >
              <Icon 
                icon={tab.icon} 
                className={cn(
                  "size-6 transition-all duration-200",
                  isActive ? "text-primary scale-110" : "text-muted-foreground scale-100"
                )} 
                style={isActive ? {filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'} : undefined}
              />
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                {tab.label}
              </span>
              <div className={cn(
                "h-1 w-1 rounded-full transition-all duration-200",
                isActive ? "bg-primary scale-100 opacity-100" : "bg-transparent scale-0 opacity-0"
              )} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
