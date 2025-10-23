import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SettingItemProps {
  label: string;
  sublabel?: string;
  type: "toggle" | "select";
  value?: boolean | string;
  options?: { value: string; label: string }[];
  onToggle?: (checked: boolean) => void;
  onSelect?: (value: string) => void;
  testId?: string;
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
      {type === "toggle" && (
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
