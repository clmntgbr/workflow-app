"use client"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { VariableDrawer } from "@/components/workflow/variable-drawer"
import { deleteWorkflowVariable } from "@/lib/workflow/variable/api"
import { WorkflowVariable } from "@/lib/workflow/variable/types"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface StepVariablesSectionProps {
  workflowId: string
  stepId: string
  enabled: boolean
  variables: WorkflowVariable[]
  onVariablesChange: (variables: WorkflowVariable[]) => void
}

function formatJsonValue(value: unknown | null): string {
  if (value == null) return ""
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function StepVariablesSection({
  workflowId,
  stepId,
  enabled,
  variables,
  onVariablesChange,
}: StepVariablesSectionProps) {
  const stepVariables = variables.filter(
    (variable) => variable.stepId === stepId
  )
  const [isVariableDrawerOpen, setIsVariableDrawerOpen] = useState(false)
  const [editingVariable, setEditingVariable] =
    useState<WorkflowVariable | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkflowVariable | null>(
    null
  )

  useEffect(() => {
    if (!enabled) {
      setIsVariableDrawerOpen(false)
      setEditingVariable(null)
    }
  }, [enabled, stepId])

  const openCreate = () => {
    setEditingVariable(null)
    setIsVariableDrawerOpen(true)
  }

  const openEdit = (variable: WorkflowVariable) => {
    setEditingVariable(variable)
    setIsVariableDrawerOpen(true)
  }

  const handleSaved = (saved: WorkflowVariable) => {
    const exists = variables.some((variable) => variable.id === saved.id)
    onVariablesChange(
      exists
        ? variables.map((variable) =>
            variable.id === saved.id ? saved : variable
          )
        : [...variables, saved]
    )
  }

  if (!enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Save the step before defining extract variables.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {stepVariables.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No variables yet. Extract values from this step&apos;s response body
          with a JSONPath.
        </p>
      ) : (
        <ul className="space-y-2">
          {stepVariables.map((variable) => (
            <li
              key={variable.id}
              className="flex items-start justify-between gap-3 rounded-md border px-3 py-2"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {variable.name}
                  </span>
                  <span className="rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {variable.key}
                  </span>
                </div>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {variable.path}
                </p>
                {variable.description ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {variable.description}
                  </p>
                ) : null}
                {variable.lastValue != null ? (
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    last: {formatJsonValue(variable.lastValue)}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${variable.name}`}
                  onClick={() => openEdit(variable)}
                >
                  <PencilIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${variable.name}`}
                  onClick={() => setDeleteTarget(variable)}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" size="sm" onClick={openCreate}>
        <PlusIcon className="size-4" />
        Add variable
      </Button>

      <VariableDrawer
        workflowId={workflowId}
        stepId={stepId}
        variable={editingVariable}
        isOpen={isVariableDrawerOpen}
        onOpenChange={(open) => {
          setIsVariableDrawerOpen(open)
          if (!open) setEditingVariable(null)
        }}
        onSaved={handleSaved}
      />

      {deleteTarget ? (
        <DeleteConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
          title="Delete variable"
          description={`Delete "${deleteTarget.name}"? References to this variable in other steps will break.`}
          onConfirm={async () => {
            await deleteWorkflowVariable(workflowId, deleteTarget.id)
          }}
          onDeleted={() => {
            onVariablesChange(
              variables.filter((variable) => variable.id !== deleteTarget.id)
            )
            if (editingVariable?.id === deleteTarget.id) {
              setIsVariableDrawerOpen(false)
              setEditingVariable(null)
            }
            setDeleteTarget(null)
            toast.success("Variable deleted")
          }}
          errorMessage="Failed to delete variable. Please try again."
        />
      ) : null}
    </div>
  )
}
