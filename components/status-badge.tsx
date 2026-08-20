import { GetStatusStyle } from "@/lib/misc"
import { cn } from "@/lib/utils"
import type { RunStatus } from "@/lib/workflow-run/types"

export function StatusBadge({
  status,
  className,
}: {
  status: RunStatus
  className?: string
}) {
  const s = GetStatusStyle(status)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        s.bg,
        s.text,
        "ring-1",
        s.ring,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", s.dot)} />
      {s.label}
    </span>
  )
}
