import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";
import { triggerHaptic } from "@/lib/haptics";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  scrollRef?: React.RefObject<HTMLDivElement>;
}

const THRESHOLD = 80;
const MAX_PULL = 130;
const RESISTANCE = 0.45;

function IslamicStar({ progress, refreshing }: { progress: number; refreshing: boolean }) {
  const size = 48;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 20;
  const innerR = 10;
  const points = 8;

  const pathParts: string[] = [];
  for (let i = 0; i < points; i++) {
    const outerAngle = (Math.PI * 2 * i) / points - Math.PI / 2;
    const innerAngle = (Math.PI * 2 * (i + 0.5)) / points - Math.PI / 2;
    const ox = cx + outerR * Math.cos(outerAngle);
    const oy = cy + outerR * Math.sin(outerAngle);
    const ix = cx + innerR * Math.cos(innerAngle);
    const iy = cy + innerR * Math.sin(innerAngle);
    pathParts.push(i === 0 ? `M ${ox} ${oy}` : `L ${ox} ${oy}`);
    pathParts.push(`L ${ix} ${iy}`);
  }
  pathParts.push("Z");
  const starPath = pathParts.join(" ");

  const totalLength = 320;
  const visibleLength = totalLength * Math.min(progress, 1);
  const dashOffset = totalLength - visibleLength;

  return (
    <div
      className={`ptr-indicator ${refreshing ? 'ptr-spinning' : ''}`}
      style={{
        transform: `scale(${0.5 + progress * 0.5})`,
        opacity: Math.min(progress * 1.5, 1),
      }}
      data-testid="pull-to-refresh-indicator"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
      >
        <circle
          cx={cx}
          cy={cy}
          r={outerR + 2}
          stroke="hsl(var(--primary) / 0.15)"
          strokeWidth="1"
          fill="none"
        />
        <path
          d={starPath}
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill={progress >= 1 ? "hsl(var(--primary) / 0.1)" : "none"}
          strokeDasharray={totalLength}
          strokeDashoffset={dashOffset}
          className="ptr-star-path"
        />
        <circle
          cx={cx}
          cy={cy}
          r={3}
          fill={`hsl(var(--primary) / ${Math.min(progress, 1)})`}
          className="ptr-center-dot"
        />
      </svg>
    </div>
  );
}

export default function PullToRefresh({
  onRefresh,
  children,
  className = "",
  scrollRef,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const hapticTriggered = useRef(false);

  const getScrollElement = useCallback(() => {
    return scrollRef?.current || containerRef.current;
  }, [scrollRef]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const scrollEl = getScrollElement();
    if (!scrollEl || refreshing) return;
    if (scrollEl.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
      hapticTriggered.current = false;
    }
  }, [getScrollElement, refreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || refreshing) return;
    const scrollEl = getScrollElement();
    if (!scrollEl || scrollEl.scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }

    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy < 0) {
      setPullDistance(0);
      return;
    }

    const distance = Math.min(dy * RESISTANCE, MAX_PULL);
    setPullDistance(distance);

    if (distance >= THRESHOLD && !hapticTriggered.current) {
      hapticTriggered.current = true;
      triggerHaptic('medium');
    }

    if (distance > 5) {
      e.preventDefault();
    }
  }, [getScrollElement, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      triggerHaptic('light');
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  useEffect(() => {
    const el = getScrollElement();
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [getScrollElement, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = pullDistance / THRESHOLD;
  const showIndicator = pullDistance > 5 || refreshing;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {showIndicator && (
        <div
          className="ptr-container"
          style={{
            height: refreshing ? `${THRESHOLD}px` : `${pullDistance}px`,
          }}
        >
          <IslamicStar progress={progress} refreshing={refreshing} />
        </div>
      )}
      {children}
    </div>
  );
}
