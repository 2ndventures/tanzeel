import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

const tajweedColors = [
  { color: "#AAAAAA", label: "Silent" },
  { color: "#E84F8C", label: "Madd (2)" },
  { color: "#F59E39", label: "Madd (2/4/6)" },
  { color: "#D72D6E", label: "Madd (4/5)" },
  { color: "#DD1D1D", label: "Madd (6)" },
  { color: "#2CA82C", label: "Ghunna / Ikhfa" },
  { color: "#19B8D2", label: "Qalqala" },
  { color: "#4271C1", label: "Tafkhim" },
];

export default function TajweedLegend() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full bg-card/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-border/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-medium text-muted-foreground"
        aria-expanded={expanded}
        aria-label="Toggle Tajweed color legend"
        data-testid="button-tajweed-legend-toggle"
      >
        <span>Tajweed colors</span>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-0.5" data-testid="tajweed-legend-grid">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {tajweedColors.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <span className="text-[11px] text-muted-foreground leading-tight">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
