"use client"

import CustomInput from "@/components/custom-input"
import CustomTextarea from "@/components/custom-textarea"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Field } from "@/components/ui/field"
import { StepPreview } from "@/components/workflow/step-preview"
import { VariablePathField } from "@/components/workflow/variable-path-field"
import { cn } from "@/lib/utils"
import {
  createWorkflowVariable,
  updateWorkflowVariable,
} from "@/lib/workflow/variable/api"
import {
  WorkflowVariable,
  WorkflowVariableKind,
} from "@/lib/workflow/variable/types"
import { Loader2Icon, Trash2Icon } from "lucide-react"
import { useState } from "react"

export type VariableDrawerStepPreview = {
  name: string
  method: string
  path: string
}

interface VariableDrawerProps {
  workflowId: string
  /** Required when creating/editing an extracted variable. */
  stepId?: string | null
  /** Source step preview for extracted variables (like endpoint on step drawer). */
  step?: VariableDrawerStepPreview | null
  kind?: WorkflowVariableKind
  variable: WorkflowVariable | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (variable: WorkflowVariable) => void
  onRequestDelete?: (variable: WorkflowVariable) => void
  nested?: boolean
}

interface VariableFormState {
  name: string
  key: string
  description: string
  path: string
  value: string
}

const emptyForm: VariableFormState = {
  name: "",
  key: "",
  description: "",
  path: "$",
  value: "",
}

/** Slug-like keys: lowercase letters, digits, `_` and `-` only. */
function toVariableKeySlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
}

function formatStaticValue(value: unknown): string {
  if (value === undefined || value === null) return ""
  if (typeof value === "string") return value
  return JSON.stringify(value, null, 2)
}

function parseStaticValue(raw: string): unknown {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    return raw
  }
}

function toFormState(variable: WorkflowVariable | null): VariableFormState {
  if (!variable) return emptyForm
  return {
    name: variable.name,
    key: variable.key,
    description: variable.description ?? "",
    path: variable.path ?? "$",
    value: formatStaticValue(variable.value),
  }
}

function resolveKind(
  variable: WorkflowVariable | null,
  kind: WorkflowVariableKind | undefined
): WorkflowVariableKind {
  if (variable?.kind) return variable.kind
  if (kind) return kind
  return variable?.stepId ? "extracted" : "static"
}

export function VariableDrawer({
  workflowId,
  stepId = null,
  step = null,
  kind: kindProp,
  variable,
  isOpen,
  onOpenChange,
  onSaved,
  onRequestDelete,
  nested = false,
}: VariableDrawerProps) {
  const isEdit = Boolean(variable)
  const kind = resolveKind(variable, kindProp)
  const isStatic = kind === "static"
  const [form, setForm] = useState<VariableFormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [openSnapshot, setOpenSnapshot] = useState({
    isOpen: false,
    variableId: null as string | null,
    kind: "extracted" as WorkflowVariableKind,
  })

  if (isOpen) {
    const variableId = variable?.id ?? null
    if (
      !openSnapshot.isOpen ||
      openSnapshot.variableId !== variableId ||
      openSnapshot.kind !== kind
    ) {
      setOpenSnapshot({ isOpen: true, variableId, kind })
      setForm(toFormState(variable))
      setFormError(null)
    }
  } else if (openSnapshot.isOpen) {
    setOpenSnapshot({ isOpen: false, variableId: null, kind: "extracted" })
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleSave = async () => {
    const name = form.name.trim()
    const key = form.key.trim()
    const path = form.path.trim()
    const description = form.description.trim()

    if (!name || !key) {
      setFormError("Name and key are required")
      return
    }

    if (!/^[a-z0-9_-]+$/.test(key)) {
      setFormError(
        "Key must be a slug: lowercase letters, numbers, underscores, and hyphens only"
      )
      return
    }

    if (isStatic) {
      if (!form.value.trim()) {
        setFormError("Value is required")
        return
      }
    } else {
      if (!path) {
        setFormError("Path is required")
        return
      }
      if (!variable && !stepId) {
        setFormError("A step is required for extracted variables")
        return
      }
    }

    setIsSaving(true)
    setFormError(null)

    try {
      if (variable) {
        const updated = await updateWorkflowVariable(
          workflowId,
          variable.id,
          isStatic
            ? {
                name,
                key,
                description,
                value: parseStaticValue(form.value),
              }
            : {
                name,
                key,
                description,
                path,
              }
        )
        onSaved(updated)
      } else if (isStatic) {
        const created = await createWorkflowVariable(workflowId, {
          kind: "static",
          name,
          key,
          description,
          value: parseStaticValue(form.value),
        })
        onSaved(created)
      } else {
        const created = await createWorkflowVariable(workflowId, {
          kind: "extracted",
          stepId: stepId as string,
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
        className={cn(
          "flex h-full w-[90vw]! max-w-[90vw]! flex-col",
          nested ? "z-95" : "z-70"
        )}
        overlayClassName={nested ? "z-90" : "z-[65]"}
      >
        <DrawerHeader className="sr-only">
          <DrawerTitle>
            {isEdit
              ? isStatic
                ? "Edit static variable"
                : "Edit variable"
              : isStatic
                ? "New static variable"
                : "New variable"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              <div className="space-y-1">
                <h2 className="font-semibold">
                  {isEdit
                    ? isStatic
                      ? "Edit static variable"
                      : "Edit variable"
                    : isStatic
                      ? "New static variable"
                      : "New variable"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isStatic ? (
                    <>
                      Constant available from workflow start. Value can be a
                      string, number, boolean, object, or array (JSON).
                    </>
                  ) : (
                    <>
                      Extract a value from this step&apos;s response body with a
                      JSONPath (e.g. <span className="">$.token</span>).
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-col gap-6 md:col-span-2">
                {!isStatic && step ? (
                  <div className="mb-6 flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-2">
                    <StepPreview
                      name={step.name}
                      method={step.method}
                      url={step.path}
                      className="min-w-0 flex-1"
                    />
                  </div>
                ) : null}
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
                {isStatic ? (
                  <Field>
                    <CustomTextarea
                      id="variable-drawer-value"
                      isRequired
                      label="Value"
                      description='Plain string or JSON (e.g. "https://api.example.com", 42, true, {"a":1})'
                      value={form.value}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, value }))
                      }
                      textareaClassName="min-h-24 "
                    />
                  </Field>
                ) : (
                  <Field>
                    <VariablePathField
                      id="variable-drawer-path"
                      workflowId={workflowId}
                      stepId={stepId ?? variable?.stepId ?? ""}
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
                )}
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
                    onClick={() => {
                      if (variable) onRequestDelete?.(variable)
                    }}
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
    </Root>
  )
}
