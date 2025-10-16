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
      className="flex items-center gap-4 p-4 hover-elevate active-elevate-2 cursor-pointer"
      onClick={onClick}
      data-testid={`card-chapter-${number}`}
    >
      <div className="flex-1 flex flex-col items-center">
        <div className="flex items-center gap-4 mb-1">
          <h3 className="font-semibold text-foreground" data-testid={`text-chapter-name-${number}`}>
            {englishName}
          </h3>
          <p className="font-arabic text-xl text-foreground">
            {getDisplayArabicName(arabicName)}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {verseCount} verses
        </p>
      </div>
      <div className="text-muted-foreground flex-shrink-0">
        <ChevronRight className="w-5 h-5" />
      </div>
    </Card>
  );
}
