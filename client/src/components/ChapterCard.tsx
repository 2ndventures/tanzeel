import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getDisplayArabicName } from "@/lib/quranData";

interface ChapterCardProps {
  number: number;
  arabicName: string;
  englishName: string;
  verseCount: number;
  revelationType: string;
  onClick?: () => void;
}

export default function ChapterCard({
  number,
  arabicName,
  englishName,
  verseCount,
  revelationType,
  onClick,
}: ChapterCardProps) {
  return (
    <Card
      className="flex items-center gap-4 p-5 hover-elevate active-elevate-2 cursor-pointer shadow-sm hover-lift transition-smooth animate-fade-in-up"
      onClick={onClick}
      data-testid={`card-chapter-${number}`}
    >
      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm" data-testid={`text-chapter-number-${number}`}>
        <span className="text-lg font-bold text-primary">{number}</span>
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-baseline gap-3">
          <h3 className="font-semibold text-lg text-foreground" data-testid={`text-chapter-name-${number}`}>
            {englishName}
          </h3>
          <p className="font-arabic text-xl text-foreground">
            {getDisplayArabicName(arabicName)}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {verseCount} verses · {revelationType}
        </p>
      </div>
      <div className="text-muted-foreground flex-shrink-0 transition-transform group-hover:translate-x-1">
        <ChevronRight className="w-5 h-5" />
      </div>
    </Card>
  );
}
