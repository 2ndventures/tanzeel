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
}

// 3-color cycle using theme tinted colors
const badgeStyles = [
  { bg: "bg-primary/20", text: "text-primary" },
  { bg: "bg-secondary/20", text: "text-secondary" },
  { bg: "bg-accent/20", text: "text-accent" },
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
      {/* Inner panel */}
      <div className="relative overflow-hidden rounded-3xl bg-card/80 dark:bg-slate-900/70 backdrop-blur-xl px-5 h-full flex items-center">
        <div className="flex items-center gap-4 w-full">
          {/* Chapter Number Badge */}
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${badge.bg} shadow-inner`}
            data-testid={`text-chapter-number-${number}`}
          >
            <span className={`${badge.text} text-lg font-bold`}>{number}</span>
          </div>

          {/* Chapter Info */}
          <div className="flex-1 min-w-0">
            <h3
              className="text-lg font-bold text-foreground mb-1"
              data-testid={`text-chapter-name-${number}`}
            >
              {englishName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {meaning} • {verseCount} Ayahs
            </p>
          </div>

          {/* Arabic Name */}
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
