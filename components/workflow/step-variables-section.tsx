"use client"

import CustomInput from "@/components/custom-input"
import CustomSwitch from "@/components/custom-switch"
import CustomTextarea from "@/components/custom-textarea"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import {
  createWorkflowVariable,
  deleteWorkflowVariable,
  updateWorkflowVariable,
} from "@/lib/workflow/variable/api"
import { WorkflowVariable } from "@/lib/workflow/variable/types"
import {
  CopyIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface StepVariablesSectionProps {
  workflowId: string
  stepId: string
  enabled: boolean
  variables: WorkflowVariable[]
  onVariablesChange: (variables: WorkflowVariable[]) => void
}

interface VariableFormState {
  name: string
  key: string
  description: string
  path: string
  isSecret: boolean
  defaultValueText: string
}

const emptyForm: VariableFormState = {
  name: "",
  key: "",
  description: "",
  path: "$.",
  isSecret: false,
  defaultValueText: "",
}

function formatJsonValue(value: unknown | null): string {
  if (value == null) return ""
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function parseDefaultValue(
  text: string
): { ok: true; value: unknown | null } | { ok: false; error: string } {
  const trimmed = text.trim()
  if (!trimmed) return { ok: true, value: null }

  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown }
  } catch {
    return {
      ok: false,
      error: "Default value must be valid JSON (e.g. \"token\", 42, true)",
    }
  }
}

function toFormState(variable: WorkflowVariable): VariableFormState {
  return {
    name: variable.name,
    key: variable.key,
    description: variable.description ?? "",
    path: variable.path,
    isSecret: variable.isSecret,
    defaultValueText: formatJsonValue(variable.defaultValue),
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
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<VariableFormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WorkflowVariable | null>(
    null
  )

  useEffect(() => {
    if (!enabled) {
      setIsFormOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      setFormError(null)
    }
  }, [enabled, stepId])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setIsFormOpen(true)
  }

  const openEdit = (variable: WorkflowVariable) => {
    setEditingId(variable.id)
    setForm(toFormState(variable))
    setFormError(null)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
  }

  const handleSave = async () => {
    const name = form.name.trim()
    const key = form.key.trim()
    const path = form.path.trim()
    const description = form.description.trim()

    if (!name || !key || !path) {
      setFormError("Name, key, and path are required")
      return
    }

    const parsedDefault = parseDefaultValue(form.defaultValueText)
    if (!parsedDefault.ok) {
      setFormError(parsedDefault.error)
      return
    }

    setIsSaving(true)
    setFormError(null)

    try {
      if (editingId) {
        const updated = await updateWorkflowVariable(workflowId, editingId, {
          name,
          key,
          description,
          path,
          isSecret: form.isSecret,
          defaultValue: parsedDefault.value,
        })
        onVariablesChange(
          variables.map((variable) =>
            variable.id === updated.id ? updated : variable
          )
        )
        toast.success("Variable updated")
      } else {
        const created = await createWorkflowVariable(workflowId, {
          stepId,
          name,
          key,
          description,
          path,
          isSecret: form.isSecret,
          defaultValue: parsedDefault.value,
        })
        onVariablesChange([...variables, created])
        toast.success("Variable created")
      }
      closeForm()
    } catch (saveError) {
      setFormError(
        saveError instanceof Error ? saveError.message : "Failed to save variable"
      )
    } finally {
      setIsSaving(false)
    }
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
      {stepVariables.length === 0 && !isFormOpen ? (
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
                  {variable.isSecret ? (
                    <span className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      secret
                    </span>
                  ) : null}
                </div>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {variable.path}
                </p>
                {variable.description ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {variable.description}
                  </p>
                ) : null}
                {!variable.isSecret && variable.lastValue != null ? (
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

      {isFormOpen ? (
        <div className="space-y-4 rounded-md border p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">
              {editingId ? "Edit variable" : "New variable"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Path is a JSONPath against the response body (e.g.{" "}
              <span className="font-mono">$.token</span>).
            </p>
          </div>

          <Field>
            <CustomInput
              id="variable-name"
              isRequired
              label="Name"
              description="Readable label in the UI"
              value={form.name}
              hasCharacterLimit
              maxLength={255}
              onChange={(value) => setForm((current) => ({ ...current, name: value }))}
            />
          </Field>
          <Field>
            <CustomInput
              id="variable-key"
              isRequired
              label="Key"
              description="Unique key within the workflow"
              value={form.key}
              hasCharacterLimit
              maxLength={255}
              onChange={(value) => setForm((current) => ({ ...current, key: value }))}
            />
          </Field>
          <Field>
            <CustomInput
              id="variable-path"
              isRequired
              label="Path"
              description="JSONPath into the response body"
              value={form.path}
              hasCharacterLimit
              maxLength={255}
              onChange={(value) => setForm((current) => ({ ...current, path: value }))}
            />
          </Field>
          <Field>
            <CustomTextarea
              id="variable-description"
              label="Description"
              description="Optional notes"
              value={form.description}
              hasCharacterLimit
              maxLength={255}
              onChange={(value) =>
                setForm((current) => ({ ...current, description: value }))
              }
              textareaClassName="min-h-20"
            />
          </Field>
          <Field>
            <CustomTextarea
              id="variable-default-value"
              label="Default value (JSON)"
              description="Optional fallback for isolated step preview"
              value={form.defaultValueText}
              onChange={(value) =>
                setForm((current) => ({ ...current, defaultValueText: value }))
              }
              textareaClassName="min-h-20 font-mono text-xs"
            />
          </Field>
          <div className="flex flex-row items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="min-w-0 flex-1 space-y-0.5">
              <Label htmlFor="variable-is-secret">Secret</Label>
              <p className="text-xs text-muted-foreground">
                Hide values in UI responses and skip LastValue storage
              </p>
            </div>
            <CustomSwitch
              id="variable-is-secret"
              value={form.isSecret}
              onChange={(value) =>
                setForm((current) => ({ ...current, isSecret: value }))
              }
            />
          </div>

          {formError ? (
            <p className="text-xs text-destructive">{formError}</p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeForm}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              {editingId ? "Update variable" : "Create variable"}
              {isSaving ? (
                <Loader2Icon className="ml-2 size-4 animate-spin" />
              ) : null}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={openCreate}>
          <PlusIcon className="size-4" />
          Add variable
        </Button>
      )}

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
            if (editingId === deleteTarget.id) closeForm()
            setDeleteTarget(null)
            toast.success("Variable deleted")
          }}
          errorMessage="Failed to delete variable. Please try again."
        />
      ) : null}
    </div>
  )
}
