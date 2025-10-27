import { Icon } from "@iconify/react";
import { Card } from "@/components/ui/card";
import { getDisplayArabicName } from "@/lib/quranData";

interface ChapterCardProps {
  number: number;
  arabicName: string;
  englishName: string;
  verseCount: number;
  revelationType: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  isFirst?: boolean;
}

export default function ChapterCard({
  number,
  arabicName,
  englishName,
  verseCount,
  revelationType,
  onClick,
  style,
  isFirst = false,
}: ChapterCardProps) {
  return (
    <Card
      className={`relative overflow-hidden p-5 hover-elevate active-elevate-2 cursor-pointer shadow-lg border border-border hover-lift transition-smooth animate-fade-in-up rounded-3xl ${
        isFirst ? "bg-gradient-to-br from-card to-secondary/30" : "bg-card"
      }`}
      onClick={onClick}
      style={style}
      data-testid={`card-chapter-${number}`}
    >
      {isFirst && (
        <div className="absolute -right-10 -bottom-10 size-32 bg-primary/10 rounded-full blur-2xl" />
      )}
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center" data-testid={`text-chapter-number-${number}`}>
              <span className="text-primary text-sm font-bold">{number}</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {verseCount} Verses · {revelationType}
            </span>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-1" data-testid={`text-chapter-name-${number}`}>
            {englishName}
          </h3>
          <p className="text-2xl font-arabic text-primary mb-1">
            {getDisplayArabicName(arabicName)}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2 ml-4">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon icon="solar:play-bold" className="size-5 text-primary" />
          </div>
        </div>
      </div>
    </Card>
  );
}
