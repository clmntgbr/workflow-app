import { Button } from "@/components/ui/button"
import { StepPreview } from "@/components/workflow/step-preview"
import { VariableUsageStep } from "@/lib/workflow/variable/types"

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
        const preview = (
          <StepPreview name={step.name} method={step.method} url={step.url} />
        )

        return (
          <li key={step.id}>
            {onStepClick ? (
              <Button
                type="button"
                variant="outline"
                className="h-auto w-full justify-start gap-3 px-4 py-2 text-left font-normal whitespace-normal"
                onClick={() => onStepClick(step)}
              >
                {preview}
              </Button>
            ) : (
              <div className="rounded-lg border border-border bg-card px-2 py-2">
                {preview}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
