import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { VariableUsageStep } from "@/lib/workflow/variable/types"

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-700 border-emerald-200",
  POST: "bg-blue-50 text-blue-700 border-blue-200",
  PUT: "bg-amber-50 text-amber-700 border-amber-200",
  PATCH: "bg-orange-50 text-orange-700 border-orange-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
  HEAD: "bg-slate-50 text-slate-700 border-slate-200",
  OPTIONS: "bg-violet-50 text-violet-700 border-violet-200",
}

interface VariableUsageStepListProps {
  steps: VariableUsageStep[]
  onStepClick?: (step: VariableUsageStep) => void
}

export function VariableUsageStepList({
  steps,
  onStepClick,
}: VariableUsageStepListProps) {
  return (
    <ul className="space-y-2">
      {steps.map((step) => {
        const method = (step.method || "GET").toUpperCase()
        const methodClass =
          METHOD_STYLES[method] ??
          "border-border bg-muted text-muted-foreground"

        const content = (
          <>
            <p className="truncate text-xs font-medium text-slate-800">
              {step.name}
            </p>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold",
                  methodClass
                )}
              >
                {method}
              </span>
              <span className="min-w-0 truncate text-[11px] text-slate-600">
                {step.url}
              </span>
            </div>
          </>
        )

        return (
          <li key={step.id}>
            {onStepClick ? (
              <Button
                type="button"
                variant="outline"
                className="h-auto w-full flex-col items-start gap-0 px-2.5 py-2 text-left font-normal whitespace-normal"
                onClick={() => onStepClick(step)}
              >
                {content}
              </Button>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                {content}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
