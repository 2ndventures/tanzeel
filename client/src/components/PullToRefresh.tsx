import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";
import { triggerHaptic } from "@/lib/haptics";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  scrollRef: React.RefObject<HTMLDivElement>;
}

const THRESHOLD = 80;
const MAX_PULL = 130;
const RESISTANCE = 0.45;
const COMPLETION_DURATION = 400;

type PtrPhase = "idle" | "refreshing" | "completing";

function IslamicStar({ progress, phase }: { progress: number; phase: PtrPhase }) {
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
  const drawProgress = phase === "refreshing" || phase === "completing" ? 1 : Math.min(progress, 1);
  const visibleLength = totalLength * drawProgress;
  const dashOffset = totalLength - visibleLength;

  const isCompleting = phase === "completing";

  return (
    <div
      className={`ptr-indicator ${phase === 'refreshing' ? 'ptr-spinning' : ''} ${isCompleting ? 'ptr-completing' : ''}`}
      style={{
        transform: phase === "refreshing" || phase === "completing"
          ? `scale(${isCompleting ? 1.15 : 1})`
          : `scale(${0.5 + progress * 0.5})`,
        opacity: isCompleting ? 0 : Math.min(progress * 1.5, 1),
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
          stroke="hsl(var(--accent) / 0.2)"
          strokeWidth="1"
          fill="none"
        />
        <path
          d={starPath}
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill={drawProgress >= 1 ? "hsl(var(--accent) / 0.08)" : "none"}
          strokeDasharray={totalLength}
          strokeDashoffset={dashOffset}
          className="ptr-star-path"
        />
        <circle
          cx={cx}
          cy={cy}
          r={3}
          fill={`hsl(var(--accent) / ${Math.min(drawProgress, 1)})`}
          className="ptr-center-dot"
        />
      </svg>
    </div>
  );
}

export default function PullToRefresh({
  onRefresh,
  children,
  scrollRef,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [phase, setPhase] = useState<PtrPhase>("idle");
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const hapticTriggered = useRef(false);
  const pullDistanceRef = useRef(0);
  const startedAtTop = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (phase !== "idle") return;
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = false;
      hapticTriggered.current = false;
      startedAtTop.current = el.scrollTop <= 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (phase !== "idle" || !startedAtTop.current) return;

      if (el.scrollTop > 0) {
        if (isPulling.current) {
          isPulling.current = false;
          pullDistanceRef.current = 0;
          setPullDistance(0);
        }
        return;
      }

      const dy = e.touches[0].clientY - touchStartY.current;

      if (dy <= 0) {
        if (isPulling.current) {
          isPulling.current = false;
          pullDistanceRef.current = 0;
          setPullDistance(0);
        }
        return;
      }

      if (!isPulling.current) {
        if (dy > 10 && el.scrollTop <= 0) {
          isPulling.current = true;
        } else {
          return;
        }
      }

      const distance = Math.min(dy * RESISTANCE, MAX_PULL);
      pullDistanceRef.current = distance;
      setPullDistance(distance);

      if (distance >= THRESHOLD && !hapticTriggered.current) {
        hapticTriggered.current = true;
        triggerHaptic('medium');
      }

      e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      const currentPull = pullDistanceRef.current;

      if (currentPull >= THRESHOLD && phase === "idle") {
        setPhase("refreshing");
        triggerHaptic('light');
        try {
          await onRefresh();
        } finally {
          setPhase("completing");
          await new Promise(resolve => setTimeout(resolve, COMPLETION_DURATION));
          setPhase("idle");
          setPullDistance(0);
          pullDistanceRef.current = 0;
        }
      } else {
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
    };

    const onTouchCancel = () => {
      isPulling.current = false;
      pullDistanceRef.current = 0;
      setPullDistance(0);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [scrollRef, phase, onRefresh]);

  const progress = pullDistance / THRESHOLD;
  const showIndicator = pullDistance > 5 || phase === "refreshing" || phase === "completing";

  return (
    <>
      {showIndicator && (
        <div
          className="ptr-container"
          style={{
            height: phase === "refreshing" ? `${THRESHOLD}px`
              : phase === "completing" ? '0px'
              : `${pullDistance}px`,
          }}
        >
          <IslamicStar progress={progress} phase={phase} />
        </div>
      )}
      {children}
    </>
  );
}
