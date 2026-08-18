"use client"

import CustomInput from "@/components/custom-input"
import CustomTextarea from "@/components/custom-textarea"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Field } from "@/components/ui/field"
import { VariablePathField } from "@/components/workflow/variable-path-field"
import {
  createWorkflowVariable,
  deleteWorkflowVariable,
  updateWorkflowVariable,
} from "@/lib/workflow/variable/api"
import { WorkflowVariable } from "@/lib/workflow/variable/types"
import { Loader2Icon, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"

interface VariableDrawerProps {
  workflowId: string
  stepId: string
  variable: WorkflowVariable | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (variable: WorkflowVariable) => void
  onDeleted?: (variableId: string) => void
  nested?: boolean
}

interface VariableFormState {
  name: string
  key: string
  description: string
  path: string
}

const emptyForm: VariableFormState = {
  name: "",
  key: "",
  description: "",
  path: "$.",
}

/** Slug-like keys: lowercase letters, digits, `_` and `-` only. */
function toVariableKeySlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
}

function toFormState(variable: WorkflowVariable | null): VariableFormState {
  if (!variable) return emptyForm
  return {
    name: variable.name,
    key: variable.key,
    description: variable.description ?? "",
    path: variable.path,
  }
}

export function VariableDrawer({
  workflowId,
  stepId,
  variable,
  isOpen,
  onOpenChange,
  onSaved,
  onDeleted,
  nested = false,
}: VariableDrawerProps) {
  const isEdit = Boolean(variable)
  const [form, setForm] = useState<VariableFormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setForm(toFormState(variable))
    setFormError(null)
    setIsDeleteOpen(false)
  }, [isOpen, variable])

  const handleClose = () => {
    onOpenChange(false)
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

    if (!/^[a-z0-9_-]+$/.test(key)) {
      setFormError(
        "Key must be a slug: lowercase letters, numbers, underscores, and hyphens only"
      )
      return
    }

    setIsSaving(true)
    setFormError(null)

    try {
      if (variable) {
        const updated = await updateWorkflowVariable(workflowId, variable.id, {
          name,
          key,
          description,
          path,
        })
        onSaved(updated)
      } else {
        const created = await createWorkflowVariable(workflowId, {
          stepId,
          name,
          key,
          description,
          path,
        })
        onSaved(created)
      }
      handleClose()
    } catch (saveError) {
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save variable"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const Root = nested ? DrawerNestedRoot : Drawer

  return (
    <Root open={isOpen} onOpenChange={onOpenChange} direction="right" modal>
      <DrawerContent
        className="z-70 flex h-full w-[70vw]! max-w-[70vw]! flex-col"
        overlayClassName="z-[65]"
      >
        <DrawerHeader className="sr-only">
          <DrawerTitle>{isEdit ? "Edit variable" : "New variable"}</DrawerTitle>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              <div className="space-y-1">
                <h2 className="font-semibold">
                  {isEdit ? "Edit variable" : "New variable"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Extract a value from this step&apos;s response body with a
                  JSONPath (e.g. <span className="font-mono">$.token</span>).
                </p>
              </div>

              <div className="flex flex-col gap-6 md:col-span-2">
                <Field>
                  <CustomInput
                    id="variable-drawer-name"
                    isRequired
                    label="Name"
                    description="Readable label in the UI"
                    value={form.name}
                    hasCharacterLimit
                    maxLength={255}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, name: value }))
                    }
                  />
                </Field>
                <Field>
                  <CustomInput
                    id="variable-drawer-key"
                    isRequired
                    label="Key"
                    description="Slug used in references like {{my_key}} — lowercase, numbers, _ and - only"
                    value={form.key}
                    hasCharacterLimit
                    maxLength={255}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        key: toVariableKeySlug(value),
                      }))
                    }
                  />
                </Field>
                <Field>
                  <VariablePathField
                    id="variable-drawer-path"
                    workflowId={workflowId}
                    stepId={stepId}
                    isRequired
                    label="Path"
                    description="JSONPath into the response body — pick from the last successful run or type manually"
                    value={form.path}
                    hasCharacterLimit
                    maxLength={255}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, path: value }))
                    }
                  />
                </Field>
                <Field>
                  <CustomTextarea
                    id="variable-drawer-description"
                    label="Description"
                    description="Optional notes"
                    value={form.description}
                    hasCharacterLimit
                    maxLength={255}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        description: value,
                      }))
                    }
                    textareaClassName="min-h-24"
                  />
                </Field>

                {formError ? (
                  <p className="text-xs text-destructive">{formError}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t bg-background px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {isEdit && variable ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setIsDeleteOpen(true)}
                    disabled={isSaving}
                  >
                    <Trash2Icon className="h-4 w-4" />
                    Delete
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleClose}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                >
                  {isEdit ? "Update" : "Create"}
                  {isSaving ? (
                    <Loader2Icon className="ml-2 h-4 w-4 animate-spin" />
                  ) : null}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>

      {variable ? (
        <DeleteConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Delete variable"
          description={`Delete "${variable.name}"? References to this variable in other steps will break.`}
          onConfirm={async () => {
            await deleteWorkflowVariable(workflowId, variable.id)
          }}
          onDeleted={() => {
            onDeleted?.(variable.id)
            setIsDeleteOpen(false)
            handleClose()
          }}
          errorMessage="Failed to delete variable. Please try again."
          className="z-[80]"
          overlayClassName="z-[75]"
        />
      ) : null}
    </Root>
  )
}
