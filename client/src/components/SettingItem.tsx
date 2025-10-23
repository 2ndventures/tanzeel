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
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground" data-testid={testId ? `${testId}-label` : undefined}>
          {label}
        </p>
        {sublabel && (
          <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
        )}
      </div>
      {type === "toggle" && isThemeToggle && (
        <div className="relative">
          <Switch
            checked={value as boolean}
            onCheckedChange={onToggle}
            data-testid={testId}
            className="relative"
          />
          <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
            <Sun className="w-3.5 h-3.5 text-yellow-500" />
            <Moon className="w-3.5 h-3.5 text-blue-400" />
          </div>
        </div>
      )}
      {type === "toggle" && !isThemeToggle && (
        <Switch
          checked={value as boolean}
          onCheckedChange={onToggle}
          data-testid={testId}
        />
      )}
      {type === "select" && options && (
        <Select value={value as string} onValueChange={onSelect}>
          <SelectTrigger className="w-32" data-testid={testId}>
            <span>Choose</span>
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
