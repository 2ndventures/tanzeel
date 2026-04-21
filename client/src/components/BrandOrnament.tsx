interface BrandOrnamentProps {
  size?: number;
  className?: string;
  animated?: boolean;
  label?: string;
}

export function BrandOrnament({ size = 64, className = "", animated = false, label }: BrandOrnamentProps) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const rings = [0.46, 0.38, 0.30];
  const petalRadius = 0.14;
  const petalOffset = 0.23;

  return (
    <span
      className={`inline-flex items-center justify-center ${animated ? "brand-ornament-pulse" : ""} ${className}`}
      style={{ width: s, height: s }}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-testid="brand-ornament"
    >
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        {rings.map((r, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={s * r}
            stroke="hsl(var(--glow-primary))"
            strokeOpacity={0.35 + i * 0.12}
            strokeWidth={Math.max(1, s * 0.012)}
            fill="none"
          />
        ))}
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const px = cx + Math.cos(rad) * s * petalOffset;
          const py = cy + Math.sin(rad) * s * petalOffset;
          return (
            <circle
              key={deg}
              cx={px}
              cy={py}
              r={s * petalRadius * 0.5}
              fill="hsl(var(--glow-primary))"
              fillOpacity={0.22}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={s * 0.08} fill="hsl(var(--glow-primary))" fillOpacity={0.9} />
      </svg>
    </span>
  );
}
