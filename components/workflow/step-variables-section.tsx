"use client"

import { Button } from "@/components/ui/button"
import { VariableDrawer } from "@/components/workflow/variable-drawer"
import { WorkflowVariable } from "@/lib/workflow/variable/types"
import { Braces, PlusIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import { Badge } from "../ui/badge"

interface StepVariablesSectionProps {
  workflowId: string
  stepId: string
  enabled: boolean
  variables: WorkflowVariable[]
  onVariablesChange: (variables: WorkflowVariable[]) => void
  onRequestDelete?: (variable: WorkflowVariable) => void
}

export function StepVariablesSection({
  workflowId,
  stepId,
  enabled,
  variables,
  onVariablesChange,
  onRequestDelete,
}: StepVariablesSectionProps) {
  const stepVariables = variables.filter(
    (variable) =>
      variable.stepId === stepId &&
      (variable.kind ?? "extracted") === "extracted"
  )
  const [isVariableDrawerOpen, setIsVariableDrawerOpen] = useState(false)
  const [editingVariable, setEditingVariable] =
    useState<WorkflowVariable | null>(null)

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

  const activeEditing =
    editingVariable &&
    variables.some((variable) => variable.id === editingVariable.id)
      ? editingVariable
      : null

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
            <li key={variable.id} className="flex items-stretch gap-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-md border p-2 text-left text-xs outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => openEdit(variable)}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md border">
                  <Braces className="size-3.5 shrink-0" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">
                    {variable.key}
                  </span>
                  <span className="block truncate">{variable.name} </span>
                </span>
                <span className="shrink-0 px-1.5 py-0.5">
                  <Badge variant="secondary">{variable.path ?? "—"}</Badge>
                </span>
              </button>
              <div className="flex shrink-0 items-center rounded-md">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete ${variable.name}`}
                  onClick={() => onRequestDelete?.(variable)}
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
        kind="extracted"
        variable={activeEditing}
        nested
        isOpen={
          isVariableDrawerOpen &&
          (editingVariable === null || Boolean(activeEditing))
        }
        onOpenChange={(open) => {
          setIsVariableDrawerOpen(open)
          if (!open) setEditingVariable(null)
        }}
        onSaved={handleSaved}
        onRequestDelete={onRequestDelete}
      />
    </div>
  )
}
