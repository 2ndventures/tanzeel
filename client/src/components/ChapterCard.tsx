import { Icon } from "@iconify/react";
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

// Color palettes for chapter badges
const badgeColors = [
  { bg: "bg-yellow-600/80", ring: "ring-yellow-600/30" }, // 1
  { bg: "bg-orange-600/80", ring: "ring-orange-600/30" }, // 2
  { bg: "bg-green-600/80", ring: "ring-green-600/30" }, // 3
  { bg: "bg-yellow-700/80", ring: "ring-yellow-700/30" }, // 4
  { bg: "bg-orange-700/80", ring: "ring-orange-700/30" }, // 5
];

export default function ChapterCard({
  number,
  arabicName,
  englishName,
  verseCount,
  revelationType,
  onClick,
  style,
}: ChapterCardProps) {
  // Cycle through colors
  const colorIndex = (number - 1) % badgeColors.length;
  const colors = badgeColors[colorIndex];

  return (
    <div
      className="relative group overflow-hidden rounded-3xl p-[1px] shadow-lg shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover-elevate active-elevate-2 cursor-pointer animate-fade-in-up"
      onClick={onClick}
      style={style}
      data-testid={`card-chapter-${number}`}
    >
      {/* Gradient border */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl" />
      
      {/* Inner glass panel */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/70 backdrop-blur-xl p-5">
        <div className="flex items-center gap-4">
          {/* Chapter Number Badge */}
          <div className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${colors.bg} ring-1 ${colors.ring} shadow-[0_4px_16px_rgba(0,0,0,0.6)]`} data-testid={`text-chapter-number-${number}`}>
            <span className="text-white text-xl font-bold" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>{number}</span>
          </div>
          
          {/* Chapter Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white mb-1" style={{textShadow: '0 2px 6px rgba(0,0,0,0.4)'}} data-testid={`text-chapter-name-${number}`}>
              {englishName}
            </h3>
            <p className="text-xs text-gray-400">
              {revelationType} • {verseCount} Ayahs
            </p>
          </div>
          
          {/* Arabic Name */}
          <div className="text-right">
            <p className="text-2xl font-arabic text-white mb-1" style={{textShadow: '0 2px 6px rgba(0,0,0,0.4)'}}>
              {getDisplayArabicName(arabicName)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
