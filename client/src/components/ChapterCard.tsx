import { getDisplayArabicName } from "@/lib/quranMetadata";

interface ChapterCardProps {
  number: number;
  arabicName: string;
  englishName: string;
  verseCount: number;
  meaning: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  isFirst?: boolean;
  currentReciterId?: string;
  audioCacheReady?: boolean;
}

const badgeStyles = [
  { bg: "bg-[hsl(var(--glow-primary)/0.18)]", text: "text-primary" },
  { bg: "bg-[hsl(var(--glow-secondary)/0.18)]", text: "text-secondary" },
  { bg: "bg-[hsl(var(--glow-accent)/0.18)]", text: "text-accent" },
];

export default function ChapterCard({
  number,
  arabicName,
  englishName,
  verseCount,
  meaning,
  onClick,
  style,
}: ChapterCardProps) {
  const colorIndex = (number - 1) % badgeStyles.length;
  const badge = badgeStyles[colorIndex];

  return (
    <div
      className="relative group overflow-hidden rounded-3xl border border-border/50 shadow-lg hover-elevate active-elevate-2 cursor-pointer animate-fade-in-up h-20"
      onClick={onClick}
      style={style}
      data-testid={`card-chapter-${number}`}
    >
      <div className="relative overflow-hidden rounded-3xl bg-card/80 backdrop-blur-xl px-5 h-full flex items-center">
        <div className="flex items-center gap-4 w-full">
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${badge.bg} shadow-inner`}
            data-testid={`text-chapter-number-${number}`}
          >
            <span className={`${badge.text} text-lg font-bold`}>{number}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <h3
                className="text-lg font-bold text-foreground"
                data-testid={`text-chapter-name-${number}`}
              >
                {englishName}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {meaning} • {verseCount} Ayahs
            </p>
          </div>

          <div className="text-right">
            <p className="text-2xl font-arabic text-foreground mb-1">
              {getDisplayArabicName(arabicName)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
