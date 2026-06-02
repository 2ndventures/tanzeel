import { Moon, Sun, SunMoon } from "lucide-react"
import { cn } from "@/lib/utils"

export type ThemeMode = 'light' | 'dark' | 'system'

const OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light', Icon: Sun },
  { mode: 'system', label: 'Auto', Icon: SunMoon },
  { mode: 'dark', label: 'Dark', Icon: Moon },
]

interface ThemeModeSelectorProps {
  value: ThemeMode
  onChange: (mode: ThemeMode) => void
  className?: string
}

export function ThemeModeSelector({ value, onChange, className }: ThemeModeSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn(
        "inline-flex items-center gap-0.5 p-0.5 rounded-full bg-muted/60 dark:bg-white/10 border border-border/40 dark:border-white/10",
        className
      )}
    >
      {OPTIONS.map(({ mode, label, Icon }) => {
        const active = value === mode
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            data-testid={`theme-mode-${mode}`}
            className={cn(
              "flex items-center justify-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium transition-all duration-200",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
