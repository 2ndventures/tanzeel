import { useEffect, useState } from "react";

const STORAGE_KEY = "tanzeel:devtool:active-word-color";
const STORAGE_GLOW_KEY = "tanzeel:devtool:active-word-glow";
const DEFAULT_HEX = "#F6932A";
const DEFAULT_GLOW = 40;

function hexToHslString(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: hue = ((b - r) / d + 2); break;
      case b: hue = ((r - g) / d + 4); break;
    }
    hue *= 60;
  }
  return `${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyColor(hex: string, glowPct: number) {
  const hsl = hexToHslString(hex);
  document.documentElement.style.setProperty("--glow-primary", hsl);
  const styleId = "word-color-tuner-style";
  let tag = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement("style");
    tag.id = styleId;
    document.head.appendChild(tag);
  }
  const alpha = (glowPct / 100).toFixed(2);
  tag.textContent = `:root:not(.dark) .active-word { text-shadow: 0 0 12px hsl(${hsl} / ${alpha}); }`;
}

export function WordColorTuner() {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_HEX; } catch { return DEFAULT_HEX; }
  });
  const [glow, setGlow] = useState<number>(() => {
    try {
      const v = localStorage.getItem(STORAGE_GLOW_KEY);
      return v ? parseInt(v, 10) : DEFAULT_GLOW;
    } catch { return DEFAULT_GLOW; }
  });

  useEffect(() => {
    applyColor(hex, glow);
    try {
      localStorage.setItem(STORAGE_KEY, hex);
      localStorage.setItem(STORAGE_GLOW_KEY, String(glow));
    } catch {}
  }, [hex, glow]);

  const reset = () => {
    setHex(DEFAULT_HEX);
    setGlow(DEFAULT_GLOW);
    document.documentElement.style.removeProperty("--glow-primary");
    document.getElementById("word-color-tuner-style")?.remove();
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_GLOW_KEY);
    } catch {}
  };

  const presets = ["#F6932A", "#F5C84A", "#CC7521", "#EE4444", "#22A06B", "#3B82F6", "#7C3AED"];

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 96,
        zIndex: 99999,
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      }}
      data-testid="word-color-tuner"
    >
      {open ? (
        <div
          style={{
            background: "hsl(var(--card))",
            color: "hsl(var(--card-foreground))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            padding: 12,
            width: 240,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: 12 }}>Active word color</strong>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontSize: 14 }}
              data-testid="button-tuner-close"
            >
              ×
            </button>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <input
              type="color"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              style={{ width: 36, height: 28, border: "none", background: "transparent", cursor: "pointer" }}
              data-testid="input-tuner-color"
            />
            <input
              type="text"
              value={hex}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) setHex(v);
                else setHex(v);
              }}
              style={{
                flex: 1,
                background: "hsl(var(--muted))",
                color: "inherit",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6,
                padding: "4px 6px",
                fontSize: 12,
                fontFamily: "monospace",
              }}
              data-testid="input-tuner-hex"
            />
          </label>

          <div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Glow {glow}%</div>
            <input
              type="range"
              min={0}
              max={100}
              value={glow}
              onChange={(e) => setGlow(parseInt(e.target.value, 10))}
              style={{ width: "100%" }}
              data-testid="input-tuner-glow"
            />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setHex(p)}
                title={p}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: p,
                  border: hex.toLowerCase() === p.toLowerCase() ? "2px solid hsl(var(--foreground))" : "1px solid hsl(var(--border))",
                  cursor: "pointer",
                  padding: 0,
                }}
                data-testid={`button-tuner-preset-${p.replace("#", "")}`}
              />
            ))}
          </div>

          <button
            onClick={reset}
            style={{
              background: "hsl(var(--muted))",
              color: "inherit",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              padding: "6px 8px",
              fontSize: 12,
              cursor: "pointer",
            }}
            data-testid="button-tuner-reset"
          >
            Reset to default
          </button>

          <div style={{ fontSize: 10, opacity: 0.6, lineHeight: 1.4 }}>
            Live-tweaking <code>--glow-primary</code> in light mode. Switch to a chapter and play to see word tracking.
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          title="Tune active-word color"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: hex,
            border: "2px solid hsl(var(--border))",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            cursor: "pointer",
          }}
          data-testid="button-tuner-open"
        />
      )}
    </div>
  );
}
