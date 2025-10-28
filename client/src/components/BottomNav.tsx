import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: "home" | "surah" | "settings";
  onTabChange: (tab: "home" | "surah" | "settings") => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "home" as const, icon: "solar:home-2-bold", label: "Home" },
    { id: "surah" as const, icon: "solar:book-2-bold", label: "Read" },
    { id: "settings" as const, icon: "solar:settings-bold", label: "Settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 px-4 pointer-events-none" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
      <div className="bg-card/95 backdrop-blur-xl rounded-full shadow-2xl border border-border px-6 py-3 flex items-center gap-6 pointer-events-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-1"
              data-testid={`button-nav-${tab.id}`}
            >
              <div className={cn(
                "min-h-[48px] min-w-[48px] size-12 rounded-2xl flex items-center justify-center transition-all",
                isActive 
                  ? "bg-gradient-to-br from-primary to-primary/90 shadow-lg shadow-primary/20" 
                  : "bg-secondary/50 hover-elevate active-elevate-2"
              )}>
                <Icon 
                  icon={tab.icon} 
                  className={cn(
                    "size-6 transition-colors",
                    isActive ? "text-white" : "text-muted-foreground"
                  )} 
                />
              </div>
              <span className={cn(
                "text-xs font-medium transition-colors",
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
