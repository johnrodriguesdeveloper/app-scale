import type { LucideIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface IconInputProps extends React.ComponentProps<typeof Input> {
  icon: LucideIcon
  error?: string
  endAdornment?: React.ReactNode
}

export function IconInput({ icon: Icon, error, endAdornment, className, ...props }: IconInputProps) {
  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-1 transition-colors focus-within:border-primary",
          error ? "border-destructive/60" : "border-input"
        )}
      >
        <Icon className={cn("size-5 shrink-0", error ? "text-destructive" : "text-muted-foreground")} />
        <Input
          className={cn(
            "border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent",
            className
          )}
          {...props}
        />
        {endAdornment}
      </div>
      {error ? <p className="mt-1.5 ml-1 text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  )
}
