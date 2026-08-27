"use client"

import CustomInput from "@/components/custom-input"
import CustomTextarea from "@/components/custom-textarea"
import { RadioDropdown } from "@/components/radio-dropdown"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Field } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { VariablePathField } from "@/components/workflow/variable-path-field"
import { cn } from "@/lib/utils"
import {
  createAssertion,
  deleteAssertion,
  updateAssertion,
} from "@/lib/workflow/assertion/api"
import {
  ASSERTION_OPERATORS,
  Assertion,
  AssertionOperator,
  AssertionSource,
  operatorNeedsExpectedValue,
  sourceNeedsPath,
} from "@/lib/workflow/assertion/types"
import { Loader2Icon, Trash2Icon } from "lucide-react"
import { useState } from "react"

interface AssertionDrawerProps {
  workflowId: string
  stepId: string
  assertion: Assertion | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (assertion: Assertion) => void
  onDeleted: (assertionId: string) => void
  nested?: boolean
}

interface AssertionFormState {
  description: string
  source: AssertionSource
  path: string
  operator: AssertionOperator
  expectedValue: string
}

const SOURCE_OPTIONS: { value: AssertionSource; label: string }[] = [
  { value: "status", label: "Status code" },
  { value: "header", label: "Header" },
  { value: "body", label: "Body (JSONPath)" },
]

const OPERATOR_OPTIONS: { value: AssertionOperator; label: string }[] =
  ASSERTION_OPERATORS.map((operator) => ({
    value: operator,
    label: operator.replace(/_/g, " "),
  }))

const emptyForm: AssertionFormState = {
  description: "",
  source: "status",
  path: "",
  operator: "equals",
  expectedValue: "",
}

function toFormState(assertion: Assertion | null): AssertionFormState {
  if (!assertion) return emptyForm

  return {
    description: assertion.description ?? "",
    source: assertion.source,
    path: assertion.path ?? "",
    operator: assertion.operator,
    expectedValue: assertion.expectedValue ?? "",
  }
}

function toPayload(form: AssertionFormState) {
  const needsPath = sourceNeedsPath(form.source)
  const needsExpected = operatorNeedsExpectedValue(form.operator)
  const expectedValue = form.expectedValue.trim()

  return {
    description: form.description.trim() || undefined,
    source: form.source,
    path: needsPath ? form.path.trim() || null : null,
    operator: form.operator,
    expectedValue: needsExpected ? expectedValue : null,
  }
}

export function AssertionDrawer({
  workflowId,
  stepId,
  assertion,
  isOpen,
  onOpenChange,
  onSaved,
  onDeleted,
  nested = false,
}: AssertionDrawerProps) {
  const isEdit = Boolean(assertion)
  const [form, setForm] = useState<AssertionFormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [openSnapshot, setOpenSnapshot] = useState({
    isOpen: false,
    assertionId: null as string | null,
  })

  if (isOpen) {
    const assertionId = assertion?.id ?? null
    if (!openSnapshot.isOpen || openSnapshot.assertionId !== assertionId) {
      setOpenSnapshot({ isOpen: true, assertionId })
      setForm(toFormState(assertion))
      setFormError(null)
    }
  } else if (openSnapshot.isOpen) {
    setOpenSnapshot({ isOpen: false, assertionId: null })
  }

  const needsPath = sourceNeedsPath(form.source)
  const needsExpected = operatorNeedsExpectedValue(form.operator)

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleSave = async () => {
    if (needsPath && !form.path.trim()) {
      setFormError(
        form.source === "header"
          ? "Header name is required"
          : "JSONPath is required"
      )
      return
    }

    if (needsExpected && !form.expectedValue.trim()) {
      setFormError("Expected value is required for this operator")
      return
    }

    const payload = toPayload(form)

    setIsSaving(true)
    setFormError(null)

    try {
      if (assertion) {
        const updated = await updateAssertion(workflowId, assertion.id, payload)
        onSaved(updated)
      } else {
        const created = await createAssertion(workflowId, stepId, payload)
        onSaved(created)
      }
      handleClose()
    } catch (saveError) {
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save assertion"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!assertion) return

    setIsDeleting(true)
    setFormError(null)

    try {
      await deleteAssertion(workflowId, assertion.id)
      onDeleted(assertion.id)
      handleClose()
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete assertion"
      )
    } finally {
      setIsDeleting(false)
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
            {isEdit ? "Edit assertion" : "New assertion"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              <div className="space-y-1">
                <h2 className="font-semibold">
                  {isEdit ? "Edit assertion" : "New assertion"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Validate the HTTP response after this step runs. Failed
                  assertions mark the step run as failed and can trigger
                  retries.
                </p>
              </div>

              <div className="flex flex-col gap-6 md:col-span-2">
                <Field>
                  <div className="space-y-2">
                    <Label htmlFor="assertion-drawer-source">Source</Label>
                    <RadioDropdown
                      id="assertion-drawer-source"
                      modal={false}
                      contentClassName="z-[100]"
                      value={
                        SOURCE_OPTIONS.find(
                          (option) => option.value === form.source
                        ) ?? SOURCE_OPTIONS[0]
                      }
                      onValueChange={(option) =>
                        setForm((current) => ({
                          ...current,
                          source: option.value,
                          path:
                            option.value === "status" ? "" : current.path,
                        }))
                      }
                      options={SOURCE_OPTIONS}
                      getValue={(option) => option.value}
                      getLabel={(option) => option.label}
                      groupLabel="Assertion source"
                      placeholder="Select source"
                    />
                  </div>
                </Field>

                {needsPath ? (
                  <Field>
                    {form.source === "body" ? (
                      <VariablePathField
                        id="assertion-drawer-path"
                        workflowId={workflowId}
                        stepId={stepId}
                        pathsKind="assertion"
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
                    ) : (
                      <CustomInput
                        id="assertion-drawer-path"
                        isRequired
                        label="Header name"
                        description='Header to read, e.g. "Content-Type"'
                        value={form.path}
                        hasCharacterLimit
                        maxLength={255}
                        onChange={(value) =>
                          setForm((current) => ({ ...current, path: value }))
                        }
                      />
                    )}
                  </Field>
                ) : null}

                <Field>
                  <div className="space-y-2">
                    <Label htmlFor="assertion-drawer-operator">Operator</Label>
                    <RadioDropdown
                      id="assertion-drawer-operator"
                      modal={false}
                      contentClassName="z-[100]"
                      value={
                        OPERATOR_OPTIONS.find(
                          (option) => option.value === form.operator
                        ) ?? OPERATOR_OPTIONS[0]
                      }
                      onValueChange={(option) =>
                        setForm((current) => ({
                          ...current,
                          operator: option.value,
                          expectedValue: operatorNeedsExpectedValue(
                            option.value
                          )
                            ? current.expectedValue
                            : "",
                        }))
                      }
                      options={OPERATOR_OPTIONS}
                      getValue={(option) => option.value}
                      getLabel={(option) => option.label}
                      groupLabel="Assertion operator"
                      placeholder="Select operator"
                    />
                  </div>
                </Field>

                {needsExpected ? (
                  <Field>
                    <CustomInput
                      id="assertion-drawer-expected-value"
                      isRequired
                      label="Expected value"
                      description={
                        form.operator === "matches_regex"
                          ? "Regular expression to match against the actual value"
                          : form.operator === "greater_than" ||
                              form.operator === "less_than"
                            ? "Numeric value to compare against"
                            : "Value to compare against the response field"
                      }
                      value={form.expectedValue}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          expectedValue: value,
                        }))
                      }
                    />
                  </Field>
                ) : null}

                <Field>
                  <CustomTextarea
                    id="assertion-drawer-description"
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
                {isEdit && assertion ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void handleDelete()}
                    disabled={isSaving || isDeleting}
                  >
                    <Trash2Icon className="h-4 w-4" />
                    Delete
                    {isDeleting ? (
                      <Loader2Icon className="ml-2 h-4 w-4 animate-spin" />
                    ) : null}
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleClose}
                  disabled={isSaving || isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={() => void handleSave()}
                  disabled={isSaving || isDeleting}
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
