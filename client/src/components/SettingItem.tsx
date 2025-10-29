import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sun, Moon } from "lucide-react";

interface SettingItemProps {
  label: string;
  sublabel?: string;
  type: "toggle" | "select";
  value?: boolean | string;
  options?: { value: string; label: string }[];
  onToggle?: (checked: boolean) => void;
  onSelect?: (value: string) => void;
  testId?: string;
  isThemeToggle?: boolean;
}

export default function SettingItem({
  label,
  sublabel,
  type,
  value,
  options,
  onToggle,
  onSelect,
  testId,
  isThemeToggle = false,
}: SettingItemProps) {
  if (type === "toggle") {
    return (
      <button
        onClick={() => onToggle?.(!value)}
        className="flex items-center justify-between py-4 px-5 min-h-[60px] w-full text-left hover-elevate active-elevate-2 transition-smooth"
      >
        <div className="flex-1 pr-4">
          <p className="text-base font-medium text-foreground" data-testid={testId ? `${testId}-label` : undefined}>
            {label}
          </p>
          {sublabel && (
            <p className="text-sm text-muted-foreground mt-1">{sublabel}</p>
          )}
        </div>
        {isThemeToggle ? (
          <div className="relative pointer-events-none">
            <Switch
              checked={value as boolean}
              data-testid={testId}
              className="relative"
            />
            <div className="absolute inset-0 flex items-center justify-between px-1">
              <Sun className="w-3.5 h-3.5 text-yellow-500" />
              <Moon className="w-3.5 h-3.5 text-blue-400" />
            </div>
          </div>
        ) : (
          <Switch
            checked={value as boolean}
            data-testid={testId}
            className="pointer-events-none"
          />
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between py-4 px-5 min-h-[60px]">
      <div className="flex-1 pr-4">
        <p className="text-base font-medium text-foreground" data-testid={testId ? `${testId}-label` : undefined}>
          {label}
        </p>
        {sublabel && (
          <p className="text-sm text-muted-foreground mt-1">{sublabel}</p>
        )}
      </div>
      {type === "select" && options && (
        <Select value={value as string} onValueChange={onSelect}>
          <SelectTrigger className="min-w-[120px] min-h-[48px] w-auto" data-testid={testId}>
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
