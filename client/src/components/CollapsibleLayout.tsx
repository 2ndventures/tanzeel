import { ReactNode } from "react";
import { StatusBarShim } from "./StatusBarShim";
import { useCollapsibleHeader } from "@/hooks/useCollapsibleHeader";

interface CollapsibleLayoutProps {
  header: ReactNode;
  children: ReactNode;
  bottomNav?: ReactNode;
  className?: string;
}

export function CollapsibleLayout({ header, children, bottomNav, className = "" }: CollapsibleLayoutProps) {
  const { isCollapsed, scrollContainerRef } = useCollapsibleHeader();

  return (
    <div className={`relative min-h-screen ${className}`}>
      <StatusBarShim />
      
      <div className={`fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border safe-area-top header-transition ${isCollapsed ? 'header-collapsed' : 'header-expanded'}`}>
        {header}
      </div>

      <div 
        ref={scrollContainerRef}
        className="relative h-screen overflow-y-auto safe-area-pad"
        style={{ paddingTop: '140px' }}
      >
        {children}
      </div>

      {bottomNav}
    </div>
  );
}
