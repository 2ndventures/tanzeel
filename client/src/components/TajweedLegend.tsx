import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

const tajweedColors = [
  { varName: "--tajweed-silent", label: "Silent letter" },
  { varName: "--tajweed-madda-normal", label: "Normal madd (2)" },
  { varName: "--tajweed-madda-obligatory", label: "Separated madd (2/4/6)" },
  { varName: "--tajweed-madda-permissible", label: "Connected madd (4/5)" },
  { varName: "--tajweed-madda-necessary", label: "Necessary madd (6)" },
  { varName: "--tajweed-ghunna", label: "Ghunna / Ikhfa" },
  { varName: "--tajweed-qalqala", label: "Qalqala (echo)" },
  { varName: "--tajweed-tafkhim", label: "Tafkhim (heavy)" },
];

export default function TajweedLegend() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full bg-card/90 backdrop-blur-xl border-t border-border/50">
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
                  style={{ backgroundColor: `var(${item.varName})` }}
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
