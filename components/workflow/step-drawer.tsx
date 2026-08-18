"use client"

import CustomInput from "@/components/custom-input"
import CustomSwitch from "@/components/custom-switch"
import CustomTextarea from "@/components/custom-textarea"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { RadioDropdown } from "@/components/radio-dropdown"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { CanvasStep } from "@/components/workflow/step-node"
import { StepVariablesSection } from "@/components/workflow/step-variables-section"
import { VariableAutocompleteField } from "@/components/workflow/variable-autocomplete-field"
import { useEndpoint } from "@/lib/endpoint/context"
import { KeyValuePair, recordToKeyValuePairs } from "@/lib/endpoint/utils"
import { cn } from "@/lib/utils"
import {
  stepFormSchema,
  StepFormValues,
  toUpdateWorkflowStepPayload,
} from "@/lib/workflow/step-schema"
import { UpdateWorkflowStepInput } from "@/lib/workflow/types"
import { listAvailableVariables } from "@/lib/workflow/variable/api"
import { WorkflowVariable } from "@/lib/workflow/variable/types"
import { subscribeWorkflowVariablesRefetch } from "@/lib/workflow/variable/variable-realtime"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const

const emptyFormValues: StepFormValues = {
  name: "",
  description: "",
  endpointId: "",
  url: "",
  method: "GET",
  body: "{}",
  headers: [],
  query: [],
  timeout: 30000,
  retryOnFailure: false,
  retryCount: 0,
  retryDelay: 1000,
}

function getStepFormValues(step?: CanvasStep | null): StepFormValues {
  if (!step) return emptyFormValues

  const method = HTTP_METHODS.includes(
    step.method.toUpperCase() as (typeof HTTP_METHODS)[number]
  )
    ? (step.method.toUpperCase() as StepFormValues["method"])
    : "GET"

  return {
    name: step.name,
    description: step.description ?? "",
    endpointId: step.endpointId,
    url: step.path,
    method,
    body: JSON.stringify(step.body ?? {}, null, 2),
    headers: recordToKeyValuePairs(step.headers),
    query: recordToKeyValuePairs(step.query),
    timeout: Math.max(1, step.timeout || 30000),
    retryOnFailure: step.retryOnFailure,
    retryCount: step.retryCount,
    retryDelay: Math.max(1, step.retryDelay || 1000),
  }
}

function KeyValueEditor({
  label,
  description,
  pairs,
  onChange,
  variables = [],
}: {
  label: string
  description: string
  pairs: KeyValuePair[]
  onChange: (pairs: KeyValuePair[]) => void
  variables?: WorkflowVariable[]
}) {
  const updatePair = (
    index: number,
    field: keyof KeyValuePair,
    value: string
  ) => {
    onChange(
      pairs.map((pair, pairIndex) =>
        pairIndex === index ? { ...pair, [field]: value } : pair
      )
    )
  }

  const addPair = () => {
    onChange([...pairs, { key: "", value: "" }])
  }

  const removePair = (index: number) => {
    onChange(pairs.filter((_, pairIndex) => pairIndex !== index))
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-2">
        {pairs.map((pair, index) => (
          <div key={`${label}-${index}`} className="flex items-center gap-2">
            <Input
              value={pair.key}
              placeholder="Key"
              onChange={(event) => updatePair(index, "key", event.target.value)}
              className="h-9 min-w-0 flex-1"
            />
            <VariableAutocompleteField
              value={pair.value}
              onChange={(value) => updatePair(index, "value", value)}
              variables={variables}
              placeholder="Value"
              className="h-9"
              wrapperClassName="min-w-0 flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => removePair(index)}
              aria-label="Remove entry"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addPair}>
        <PlusIcon className="size-4" />
        Add entry
      </Button>
    </div>
  )
}

interface StepDrawerProps {
  workflowId: string
  step: CanvasStep | null
  variables: WorkflowVariable[]
  onVariablesChange: (variables: WorkflowVariable[]) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: UpdateWorkflowStepInput) => Promise<void>
  onDelete?: (stepId: string) => Promise<void>
  onDeleted?: () => void
}

export function StepDrawer({
  workflowId,
  step,
  variables,
  onVariablesChange,
  isOpen,
  onOpenChange,
  onSave,
  onDelete,
  onDeleted,
}: StepDrawerProps) {
  const { endpoints } = useEndpoint()
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [availableVariables, setAvailableVariables] = useState<
    WorkflowVariable[]
  >([])

  const {
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<StepFormValues>({
    resolver: zodResolver(stepFormSchema),
    defaultValues: emptyFormValues,
  })

  const retryOnFailure = useWatch({
    control,
    name: "retryOnFailure",
  })

  useEffect(() => {
    if (!isOpen) return
    reset(getStepFormValues(step))
  }, [isOpen, step, reset])

  useEffect(() => {
    if (!isOpen || !step || step.id.startsWith("temp-")) {
      setAvailableVariables([])
      return
    }

    let cancelled = false

    const load = async () => {
      try {
        const next = await listAvailableVariables(workflowId, step.id)
        if (!cancelled) setAvailableVariables(next)
      } catch {
        if (!cancelled) setAvailableVariables([])
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [isOpen, workflowId, step])

  useEffect(() => {
    if (!isOpen || !step || step.id.startsWith("temp-")) return

    return subscribeWorkflowVariablesRefetch(workflowId, () => {
      void listAvailableVariables(workflowId, step.id)
        .then(setAvailableVariables)
        .catch(() => setAvailableVariables([]))
    })
  }, [isOpen, workflowId, step])

  const onClose = () => {
    reset(getStepFormValues(step))
    onOpenChange(false)
  }

  const onSubmit = async (data: StepFormValues) => {
    if (!step) return

    setIsSaving(true)
    try {
      await onSave(toUpdateWorkflowStepPayload(data))
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
        <DrawerContent className="flex h-full w-[80vw]! max-w-[80vw]! flex-col">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Edit Step</DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <form
              id="step-form"
              onSubmit={handleSubmit(onSubmit)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                  <div className="space-y-1">
                    <h2 className="font-semibold">General Information</h2>
                    <p className="text-sm text-muted-foreground">
                      Define the step name, URL, and HTTP method.
                    </p>
                  </div>
                  <div className="flex flex-col gap-6 md:col-span-2">
                    <Field>
                      <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                          <CustomInput
                            id="step-name"
                            isRequired
                            label="Name"
                            hasError={!!errors.name}
                            errorMessage={errors.name?.message}
                            description="The name of the step"
                            value={field.value ?? ""}
                            hasCharacterLimit
                            maxLength={255}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </Field>
                    <Field>
                      <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                          <CustomTextarea
                            id="step-description"
                            label="Description"
                            hasError={!!errors.description}
                            errorMessage={errors.description?.message}
                            description="Optional notes about this step"
                            value={field.value ?? ""}
                            hasCharacterLimit
                            maxLength={2000}
                            onChange={field.onChange}
                            textareaClassName="min-h-24"
                          />
                        )}
                      />
                    </Field>
                    <Field>
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <Controller
                            name="method"
                            control={control}
                            render={({ field }) => (
                              <div className="w-[8.5rem] shrink-0 space-y-2">
                                <Label htmlFor="step-method">Method</Label>
                                <RadioDropdown
                                  id="step-method"
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  options={[...HTTP_METHODS]}
                                  groupLabel="HTTP method"
                                  placeholder="Method"
                                />
                                {errors.method?.message ? (
                                  <p className="text-xs text-destructive">
                                    {errors.method.message}
                                  </p>
                                ) : null}
                              </div>
                            )}
                          />
                          <Controller
                            name="url"
                            control={control}
                            render={({ field }) => (
                              <div className="min-w-0 flex-1 space-y-2">
                                <Label htmlFor="step-url">
                                  URL
                                  <span className="ml-1 text-destructive">
                                    *
                                  </span>
                                </Label>
                                <VariableAutocompleteField
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  variables={availableVariables}
                                  placeholder="https://api.example.com/resource/{{id}}"
                                  className="h-9"
                                />
                                {errors.url ? (
                                  <p className="text-xs text-destructive">
                                    {errors.url.message}
                                  </p>
                                ) : null}
                              </div>
                            )}
                          />
                        </div>
                      </div>
                    </Field>
                  </div>
                </div>

                <Separator className="my-10" />

                <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                  <div className="space-y-1">
                    <h2 className="font-semibold">Request</h2>
                    <p className="text-sm text-muted-foreground">
                      Configure headers and query parameters.
                    </p>
                  </div>
                  <div className="flex flex-col gap-6 md:col-span-2">
                    <Controller
                      name="headers"
                      control={control}
                      render={({ field }) => (
                        <KeyValueEditor
                          label="Headers"
                          description="Optional HTTP headers"
                          pairs={field.value ?? []}
                          onChange={field.onChange}
                          variables={availableVariables}
                        />
                      )}
                    />
                    <Controller
                      name="query"
                      control={control}
                      render={({ field }) => (
                        <KeyValueEditor
                          label="Query"
                          description="Optional query string parameters"
                          pairs={field.value ?? []}
                          onChange={field.onChange}
                          variables={availableVariables}
                        />
                      )}
                    />
                    <Field>
                      <div className="space-y-2">
                        <Label htmlFor="step-body">
                          Body (JSON)
                          <span className="ml-1 text-destructive">*</span>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Raw JSON request body.
                        </p>
                      </div>
                      <Controller
                        name="body"
                        control={control}
                        render={({ field }) => (
                          <VariableAutocompleteField
                            value={field.value ?? "{}"}
                            onChange={field.onChange}
                            variables={availableVariables}
                            isTextarea
                            className="min-h-40 text-xs"
                          />
                        )}
                      />
                      {errors.body ? (
                        <p className="text-xs text-destructive">
                          {errors.body.message}
                        </p>
                      ) : null}
                    </Field>
                  </div>
                </div>

                <Separator className="my-10" />

                <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                  <div className="space-y-1">
                    <h2 className="font-semibold">Execution</h2>
                    <p className="text-sm text-muted-foreground">
                      Timeout and retry settings in milliseconds.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-2">
                    <Field>
                      <Controller
                        name="timeout"
                        control={control}
                        render={({ field }) => (
                          <CustomInput
                            id="step-timeout"
                            isRequired
                            label="Timeout (ms)"
                            hasError={!!errors.timeout}
                            errorMessage={errors.timeout?.message}
                            description="Request timeout"
                            value={String(field.value ?? 0)}
                            onChange={(value) =>
                              field.onChange(Number.parseInt(value || "0", 10))
                            }
                          />
                        )}
                      />
                    </Field>
                    <div
                      className={cn(
                        "flex flex-row items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
                      )}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <Label htmlFor="step-retry-on-failure">
                          Retry on failure
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Retry the request when it fails
                        </p>
                      </div>
                      <Controller
                        name="retryOnFailure"
                        control={control}
                        render={({ field }) => (
                          <CustomSwitch
                            id="step-retry-on-failure"
                            value={field.value ?? false}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                    <Field>
                      <Controller
                        name="retryCount"
                        control={control}
                        render={({ field }) => (
                          <CustomInput
                            id="step-retry-count"
                            isRequired
                            label="Retry count"
                            hasError={!!errors.retryCount}
                            errorMessage={errors.retryCount?.message}
                            description="Number of retries"
                            value={String(field.value ?? 0)}
                            disabled={!retryOnFailure}
                            onChange={(value) =>
                              field.onChange(Number.parseInt(value || "0", 10))
                            }
                          />
                        )}
                      />
                    </Field>
                    <Field>
                      <Controller
                        name="retryDelay"
                        control={control}
                        render={({ field }) => (
                          <CustomInput
                            id="step-retry-delay"
                            isRequired
                            label="Retry delay (ms)"
                            hasError={!!errors.retryDelay}
                            errorMessage={errors.retryDelay?.message}
                            description="Delay between retries"
                            value={String(field.value ?? 0)}
                            disabled={!retryOnFailure}
                            onChange={(value) =>
                              field.onChange(Number.parseInt(value || "0", 10))
                            }
                          />
                        )}
                      />
                    </Field>
                  </div>
                </div>

                <Separator className="my-10" />

                <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                  <div className="space-y-1">
                    <h2 className="font-semibold">Variables</h2>
                    <p className="text-sm text-muted-foreground">
                      Extract values from this step&apos;s response for later
                      steps. Reference variables by key in other steps:{" "}
                      <span className="text-xs text-muted-foreground">
                        {"{{myKey}}"}
                      </span>
                      .
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    {step ? (
                      <StepVariablesSection
                        workflowId={workflowId}
                        stepId={step.id}
                        enabled={!step.id.startsWith("temp-")}
                        variables={variables}
                        onVariablesChange={onVariablesChange}
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t bg-background px-6 py-4">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {step && onDelete ? (
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
                      onClick={onClose}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="w-full sm:w-auto"
                      disabled={isSaving || !step}
                    >
                      Update
                      {isSaving ? (
                        <Loader2Icon className="ml-2 h-4 w-4 animate-spin" />
                      ) : null}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </DrawerContent>
      </Drawer>

      {step && onDelete ? (
        <DeleteConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Delete step"
          description="This action cannot be undone. The step and its connections will be removed."
          onConfirm={() => onDelete(step.id)}
          onDeleted={() => {
            onClose()
            onDeleted?.()
          }}
          errorMessage="Failed to delete step. Please try again."
        />
      ) : null}
    </>
  )
}
