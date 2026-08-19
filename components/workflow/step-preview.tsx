import { cn } from "@/lib/utils"

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-700 border-emerald-200",
  POST: "bg-blue-50 text-blue-700 border-blue-200",
  PUT: "bg-amber-50 text-amber-700 border-amber-200",
  PATCH: "bg-orange-50 text-orange-700 border-orange-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
  HEAD: "bg-slate-50 text-slate-700 border-slate-200",
  OPTIONS: "bg-violet-50 text-violet-700 border-violet-200",
}

interface StepPreviewProps {
  name: string
  method: string
  url: string
  description?: string | null
  className?: string
}

export function StepPreview({
  name,
  method,
  url,
  description,
  className,
}: StepPreviewProps) {
  const normalizedMethod = (method || "GET").toUpperCase()
  const methodClass =
    METHOD_STYLES[normalizedMethod] ??
    "border-border bg-muted text-muted-foreground"

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <span
        className={cn(
          "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
          methodClass
        )}
      >
        {normalizedMethod}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">
          {name}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{url}</p>
        {description ? (
          <p className="truncate text-[11px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  )
}
