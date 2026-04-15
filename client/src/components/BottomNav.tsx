import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { subscribeDownloadState, getDownloadActive } from "@/lib/downloadState";

interface BottomNavProps {
  activeTab: "home" | "surah" | "settings" | "bookmarks";
  onTabChange: (tab: "home" | "surah" | "settings" | "bookmarks") => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(getDownloadActive);

  useEffect(() => {
    return subscribeDownloadState(setIsDownloading);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const threshold = 150;
    const handleResize = () => {
      const heightDiff = window.innerHeight - vv.height;
      setKeyboardVisible(heightDiff > threshold);
    };
    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, []);

  const tabs = [
    { id: "home" as const, icon: "solar:home-2-bold", label: "Home" },
    { id: "surah" as const, icon: "solar:book-bold", label: "Surahs" },
    { id: "bookmarks" as const, icon: "solar:bookmark-bold", label: "Bookmarks" },
    { id: "settings" as const, icon: "solar:settings-bold", label: "Settings" },
  ];

  if (keyboardVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 shrink-0 border-t border-border bg-card/80 backdrop-blur-xl shadow-2xl safe-area-bottom">
      <div className="flex items-center justify-around px-4 pt-3 pb-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => { onTabChange(tab.id); }}
              className="relative flex flex-col items-center gap-1.5 min-h-[48px] min-w-[48px] justify-center rounded-lg px-2"
              data-testid={`button-nav-${tab.id}`}
            >
              {tab.id === "settings" && isDownloading && (
                <span className="absolute top-1 right-1 flex size-2.5" data-testid="badge-downloading">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
                </span>
              )}
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
