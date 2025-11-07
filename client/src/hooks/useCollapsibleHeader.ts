import { useState, useEffect, useRef, useCallback } from 'react';

export function useCollapsibleHeader() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const currentScrollY = scrollContainerRef.current.scrollTop;
    const scrollingDown = currentScrollY > lastScrollY;
    const scrollingUp = currentScrollY < lastScrollY;

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

    setLastScrollY(currentScrollY);
  }, [lastScrollY]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return {
    isCollapsed,
    scrollContainerRef,
    sentinelRef,
  };
}
