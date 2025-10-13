import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

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
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground" data-testid={`text-chapter-name-${number}`}>
          {arabicName}
        </h3>
        <p className="text-sm text-muted-foreground">
          {englishName} • {verseCount} verses
        </p>
      </div>
      <div className="text-muted-foreground">
        <ChevronRight className="w-5 h-5" />
      </div>
    </Card>
  );
}
