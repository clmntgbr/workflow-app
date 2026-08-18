"use client"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { VariableUsageStepList } from "@/components/workflow/variable-usage-step-list"
import { deleteWorkflowVariable } from "@/lib/workflow/variable/api"
import {
  VariableInUseError,
  VariableUsageStep,
  WorkflowVariable,
} from "@/lib/workflow/variable/types"
import { Loader2Icon } from "lucide-react"
import { useState } from "react"

interface VariableUsageDrawerProps {
  workflowId: string
  variable: WorkflowVariable | null
  steps: VariableUsageStep[]
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (variableId: string) => void
  onOpenStep: (step: VariableUsageStep) => void
}

export function VariableUsageDrawer({
  workflowId,
  variable,
  steps,
  isOpen,
  onOpenChange,
  onDeleted,
  onOpenStep,
}: VariableUsageDrawerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [usageSteps, setUsageSteps] = useState<VariableUsageStep[]>([])
  const [error, setError] = useState<string | null>(null)

  const displayedSteps = usageSteps.length > 0 ? usageSteps : steps

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setUsageSteps([])
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  const handleRetryDelete = async () => {
    if (!variable) return

    setIsLoading(true)
    setError(null)

    try {
      await deleteWorkflowVariable(workflowId, variable.id)
      onDeleted(variable.id)
      onOpenChange(false)
    } catch (retryError) {
      if (retryError instanceof VariableInUseError) {
        setUsageSteps(retryError.steps)
      } else {
        setError(
          retryError instanceof Error
            ? retryError.message
            : "Failed to delete variable. Please try again."
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange} direction="right">
      <DrawerContent
        className="z-80 flex h-full w-[28rem]! max-w-[90vw]! flex-col"
        overlayClassName="z-75"
      >
        <DrawerHeader className="px-6 pt-6">
          <DrawerTitle>Variable in use</DrawerTitle>
          <DrawerDescription>
            {`"${variable?.name ?? "This variable"}" is used by one or more steps.
            Remove those references, then delete again.`}
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-2">
          <VariableUsageStepList
            steps={displayedSteps}
            onStepClick={onOpenStep}
          />
          {error ? (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          ) : null}
        </div>

        <DrawerFooter className="flex-row justify-end border-t bg-background px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleRetryDelete()}
            disabled={isLoading}
          >
            Delete
            {isLoading ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : null}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
