import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: "home" | "surah" | "settings";
  onTabChange: (tab: "home" | "surah" | "settings") => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "home" as const, icon: "solar:home-2-bold", label: "Home" },
    { id: "surah" as const, icon: "solar:book-bold", label: "Surahs" },
    { id: "settings" as const, icon: "solar:settings-bold", label: "Settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-slate-800/60 backdrop-blur-xl">
      <div className="flex items-center justify-around px-8 py-5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-2"
              data-testid={`button-nav-${tab.id}`}
            >
              <Icon 
                icon={tab.icon} 
                className={cn(
                  "size-7 transition-all",
                  isActive ? "text-primary drop-shadow-[0_0_10px_rgba(255,214,10,0.8)]" : "text-gray-400"
                )} 
              />
              <span className={cn(
                "text-xs font-medium transition-colors",
                isActive ? "text-primary font-semibold drop-shadow-lg" : "text-gray-400"
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
