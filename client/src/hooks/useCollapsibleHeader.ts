import { useState, useEffect, useRef } from 'react';

export function useCollapsibleHeader() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastScrollYRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
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
  }, []);

  return {
    isCollapsed,
    scrollContainerRef,
    sentinelRef,
  };
}
