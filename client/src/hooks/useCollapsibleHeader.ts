import { useState, useEffect, useRef } from 'react';

interface CollapsibleHeaderOptions {
  disabled?: boolean;
}

export function useCollapsibleHeader(options?: CollapsibleHeaderOptions) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastScrollYRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Force expand when collapsing is disabled (e.g. during active search)
  useEffect(() => {
    if (options?.disabled && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [options?.disabled, isCollapsed]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (options?.disabled) return;

      const currentScrollY = scrollContainer.scrollTop;
      const scrollingDown = currentScrollY > lastScrollYRef.current;
      const scrollingUp = currentScrollY < lastScrollYRef.current;

      // Show header when:
      // 1. Scrolling up
      // 2. At the very top (scrollY === 0)
      if (scrollingUp || currentScrollY === 0) {
        setIsCollapsed(false);
      }
      // Hide header when scrolling down AND past threshold (50px)
      else if (scrollingDown && currentScrollY > 50) {
        setIsCollapsed(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [options?.disabled]);

  return {
    isCollapsed,
    scrollContainerRef,
    sentinelRef,
  };
}
