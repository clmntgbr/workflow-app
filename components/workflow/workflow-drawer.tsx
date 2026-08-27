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
import { cn } from "@/lib/utils"
import { getWorkflow } from "@/lib/workflow/api"
import { useWorkflow } from "@/lib/workflow/context"
import {
  toCreateWorkflowPayload,
  toDatetimeLocalValue,
  toUpdateWorkflowPayload,
  workflowSchema,
} from "@/lib/workflow/schema"
import { ScheduleType, ScheduleUnit, Workflow } from "@/lib/workflow/types"
import { hasNotificationTarget } from "@/lib/workflow/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import z from "zod"

type WorkflowFormValues = z.infer<typeof workflowSchema>

const SCHEDULE_TYPES: { value: ScheduleType; label: string }[] = [
  { value: "none", label: "None (manual only)" },
  { value: "recurring", label: "Recurring" },
  { value: "once", label: "Once" },
]

const SCHEDULE_UNITS: { value: ScheduleUnit; label: string }[] = [
  { value: "minute", label: "Minutes" },
  { value: "hour", label: "Hours" },
  { value: "day", label: "Days" },
  { value: "week", label: "Weeks" },
  { value: "month", label: "Months" },
  { value: "year", label: "Years" },
]

const emptyFormValues: WorkflowFormValues = {
  name: "",
  description: "",
  scheduleType: "none",
  scheduleIntervalValue: 1,
  scheduleIntervalUnit: "hour",
  scheduleAt: "",
  notificationsEnabled: false,
  notifyOnSuccess: false,
  notifyOnFailure: false,
  notifyOnCancel: false,
}

interface WorkflowDrawerProps {
  workflow?: Workflow | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (workflow: Workflow) => void
  onDeleted?: () => void
}

function getWorkflowFormValues(
  workflow?: Workflow | null
): WorkflowFormValues {
  if (!workflow) return emptyFormValues

  const scheduleType = SCHEDULE_TYPES.some(
    (item) => item.value === workflow.scheduleType
  )
    ? (workflow.scheduleType as ScheduleType)
    : "none"

  return {
    name: workflow.name,
    description: workflow.description ?? "",
    scheduleType,
    scheduleIntervalValue: workflow.scheduleIntervalValue || 1,
    scheduleIntervalUnit: SCHEDULE_UNITS.some(
      (item) => item.value === workflow.scheduleIntervalUnit
    )
      ? (workflow.scheduleIntervalUnit as ScheduleUnit)
      : "hour",
    scheduleAt: toDatetimeLocalValue(workflow.scheduleAt),
    notificationsEnabled: workflow.notificationsEnabled ?? false,
    notifyOnSuccess: workflow.notifyOnSuccess ?? false,
    notifyOnFailure: workflow.notifyOnFailure ?? false,
    notifyOnCancel: workflow.notifyOnCancel ?? false,
  }
}

export function WorkflowDrawer({
  workflow,
  isOpen,
  onOpenChange,
  onSaved,
  onDeleted,
}: WorkflowDrawerProps) {
  const { createWorkflow, updateWorkflow, removeWorkflow } = useWorkflow()
  const isCreate = !workflow

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [detailedWorkflow, setDetailedWorkflow] = useState<Workflow | null>(
    null
  )

  const {
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowSchema),
    defaultValues: emptyFormValues,
  })

  const scheduleType = useWatch({
    control,
    name: "scheduleType",
  })
  const notificationsEnabled = useWatch({
    control,
    name: "notificationsEnabled",
  })
  const notifyOnSuccess = useWatch({ control, name: "notifyOnSuccess" })
  const notifyOnFailure = useWatch({ control, name: "notifyOnFailure" })
  const notifyOnCancel = useWatch({ control, name: "notifyOnCancel" })

  const activeWorkflow = detailedWorkflow ?? workflow

  const handleNotifyTargetChange = (
    fieldName: "notifyOnSuccess" | "notifyOnFailure" | "notifyOnCancel",
    value: boolean
  ) => {
    const nextValues = {
      notifyOnSuccess: notifyOnSuccess ?? false,
      notifyOnFailure: notifyOnFailure ?? false,
      notifyOnCancel: notifyOnCancel ?? false,
      [fieldName]: value,
    }

    setValue(fieldName, value)

    if (!hasNotificationTarget(nextValues)) {
      setValue("notificationsEnabled", false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setDetailedWorkflow(null)
      return
    }

    if (!workflow) {
      setDetailedWorkflow(null)
      reset(emptyFormValues)
      return
    }

    setDetailedWorkflow(workflow)
    reset(getWorkflowFormValues(workflow))

    let cancelled = false

    void getWorkflow(workflow.id)
      .then((full) => {
        if (cancelled) return
        setDetailedWorkflow(full)
        reset(getWorkflowFormValues(full))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
    // Intentionally keyed on workflow.id so a list refetch does not reset the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, workflow?.id, reset])

  const onClose = () => {
    reset(getWorkflowFormValues(activeWorkflow))
    onOpenChange(false)
  }

  const onSubmit = async (data: WorkflowFormValues) => {
    setIsSaving(true)
    try {
      if (isCreate) {
        const created = await createWorkflow(toCreateWorkflowPayload(data))
        onSaved?.(created)
      } else if (activeWorkflow) {
        const updated = await updateWorkflow(
          activeWorkflow.id,
          toUpdateWorkflowPayload(data, {
            status: activeWorkflow.status,
            concurrency: activeWorkflow.concurrency,
          })
        )
        onSaved?.(updated)
      }
      onClose()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save workflow"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const onInvalidSubmit = () => {
    const form = document.getElementById("workflow-form")
    form
      ?.querySelector("[aria-invalid='true']")
      ?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
        <DrawerContent className="flex h-full w-[80vw]! max-w-[80vw]! flex-col">
          <DrawerHeader className="sr-only">
            <DrawerTitle>
              {isCreate ? "Create Workflow" : "Edit Workflow"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <form
              id="workflow-form"
              onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
              <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                <div className="space-y-1">
                  <h2 className="font-semibold">General Information</h2>
                  <p className="text-sm text-muted-foreground">
                    Define the workflow&apos;s name and description.
                  </p>
                </div>

                <div className="flex flex-col gap-6 md:col-span-2">
                  <Field>
                    <Controller
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <CustomInput
                          id="input-field-name"
                          isRequired={true}
                          label="Name"
                          hasError={!!errors.name}
                          errorMessage={errors.name?.message}
                          description="The name of the workflow"
                          value={field.value ?? ""}
                          hasCharacterLimit={true}
                          maxLength={100}
                          onChange={(value) => field.onChange(value)}
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
                          id="input-field-description"
                          isRequired={false}
                          label="Description"
                          hasError={!!errors.description}
                          errorMessage={errors.description?.message}
                          description="Optional notes about this workflow"
                          value={field.value ?? ""}
                          hasCharacterLimit={true}
                          maxLength={255}
                          onChange={(value) => field.onChange(value)}
                          textareaClassName="min-h-24"
                        />
                      )}
                    />
                  </Field>
                </div>
              </div>

              <Separator className="my-10" />

              <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                <div className="space-y-1">
                  <h2 className="font-semibold">Schedule</h2>
                  <p className="text-sm text-muted-foreground">
                    Choose how this workflow is triggered.
                  </p>
                </div>
                <div className="flex flex-col gap-6 md:col-span-2">
                  <Field>
                    <Controller
                      name="scheduleType"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label htmlFor="workflow-schedule-type">Type</Label>
                          <RadioDropdown
                            id="workflow-schedule-type"
                            value={
                              SCHEDULE_TYPES.find(
                                (type) => type.value === field.value
                              ) ?? SCHEDULE_TYPES[0]
                            }
                            onValueChange={(type) =>
                              field.onChange(type.value)
                            }
                            options={SCHEDULE_TYPES}
                            getValue={(type) => type.value}
                            getLabel={(type) => type.label}
                            groupLabel="Schedule type"
                            placeholder="Select type"
                          />
                        </div>
                      )}
                    />
                  </Field>

                  {scheduleType === "recurring" ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <Field>
                        <Controller
                          name="scheduleIntervalValue"
                          control={control}
                          render={({ field }) => (
                            <CustomInput
                              id="workflow-schedule-interval-value"
                              isRequired
                              label="Every"
                              hasError={!!errors.scheduleIntervalValue}
                              errorMessage={
                                errors.scheduleIntervalValue?.message
                              }
                              description="Minimum interval is 1 minute"
                              value={String(field.value ?? 1)}
                              onChange={(value) =>
                                field.onChange(
                                  Number.parseInt(value || "1", 10)
                                )
                              }
                            />
                          )}
                        />
                      </Field>
                      <Field>
                        <Controller
                          name="scheduleIntervalUnit"
                          control={control}
                          render={({ field }) => (
                            <div className="space-y-2">
                              <Label htmlFor="workflow-schedule-interval-unit">
                                Unit
                              </Label>
                              <RadioDropdown
                                id="workflow-schedule-interval-unit"
                                value={
                                  SCHEDULE_UNITS.find(
                                    (unit) => unit.value === field.value
                                  ) ?? SCHEDULE_UNITS[0]
                                }
                                onValueChange={(unit) =>
                                  field.onChange(unit.value)
                                }
                                options={SCHEDULE_UNITS}
                                getValue={(unit) => unit.value}
                                getLabel={(unit) => unit.label}
                                groupLabel="Interval unit"
                                placeholder="Select unit"
                              />
                              {errors.scheduleIntervalUnit?.message ? (
                                <p className="text-xs text-destructive">
                                  {errors.scheduleIntervalUnit.message}
                                </p>
                              ) : null}
                            </div>
                          )}
                        />
                      </Field>
                    </div>
                  ) : null}

                  {scheduleType === "once" ? (
                    <Field>
                      <Controller
                        name="scheduleAt"
                        control={control}
                        render={({ field }) => (
                          <div className="space-y-2">
                            <Label htmlFor="workflow-schedule-at">
                              Run at
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="workflow-schedule-at"
                              type="datetime-local"
                              value={field.value ?? ""}
                              onChange={(event) =>
                                field.onChange(event.target.value)
                              }
                              className={cn(
                                "h-9 bg-white shadow-none dark:bg-background",
                                errors.scheduleAt &&
                                  "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
                              )}
                            />
                            {errors.scheduleAt?.message ? (
                              <p className="text-xs text-destructive">
                                {errors.scheduleAt.message}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Exact date and time in your local timezone
                              </p>
                            )}
                          </div>
                        )}
                      />
                    </Field>
                  ) : null}

                  {!isCreate && activeWorkflow?.nextRunAt ? (
                    <div className="space-y-1 rounded-lg border px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        Next run
                      </p>
                      <p className="text-sm">
                        {new Date(activeWorkflow.nextRunAt).toLocaleString()}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <Separator className="my-10" />

              <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                <div className="space-y-1">
                  <h2 className="font-semibold">Notifications</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure when to send notifications for this workflow.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-2">
                  <div className="flex flex-row items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <Label
                        htmlFor="switch-field-notifications-enabled"
                        className="cursor-pointer"
                      >
                        Enable notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Send notifications for this workflow
                      </p>
                      {errors.notificationsEnabled?.message && (
                        <p className="text-xs text-destructive">
                          {errors.notificationsEnabled.message}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <Controller
                        name="notificationsEnabled"
                        control={control}
                        render={({ field }) => (
                          <CustomSwitch
                            id="switch-field-notifications-enabled"
                            value={field.value ?? false}
                            hasError={!!errors.notificationsEnabled}
                            onChange={(v) => {
                              field.onChange(v)
                              if (!v) {
                                setValue("notifyOnSuccess", false)
                                setValue("notifyOnFailure", false)
                                setValue("notifyOnCancel", false)
                              }
                            }}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex flex-row items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900",
                      !notificationsEnabled && "opacity-60"
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <Label
                        htmlFor="switch-field-notify-on-success"
                        className="cursor-pointer"
                      >
                        Notify on success
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        When the workflow completes successfully
                      </p>
                    </div>
                    <div className="shrink-0">
                      <Controller
                        name="notifyOnSuccess"
                        control={control}
                        render={({ field }) => (
                          <CustomSwitch
                            id="switch-field-notify-on-success"
                            value={field.value ?? false}
                            isDisabled={!notificationsEnabled}
                            onChange={(v) =>
                              handleNotifyTargetChange("notifyOnSuccess", v)
                            }
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex flex-row items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900",
                      !notificationsEnabled && "opacity-60"
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <Label
                        htmlFor="switch-field-notify-on-failure"
                        className="cursor-pointer"
                      >
                        Notify on failure
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        When the workflow fails
                      </p>
                    </div>
                    <div className="shrink-0">
                      <Controller
                        name="notifyOnFailure"
                        control={control}
                        render={({ field }) => (
                          <CustomSwitch
                            id="switch-field-notify-on-failure"
                            value={field.value ?? false}
                            isDisabled={!notificationsEnabled}
                            onChange={(v) =>
                              handleNotifyTargetChange("notifyOnFailure", v)
                            }
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex flex-row items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900",
                      !notificationsEnabled && "opacity-60"
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <Label
                        htmlFor="switch-field-notify-on-cancel"
                        className="cursor-pointer"
                      >
                        Notify on cancel
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        When the workflow is canceled
                      </p>
                    </div>
                    <div className="shrink-0">
                      <Controller
                        name="notifyOnCancel"
                        control={control}
                        render={({ field }) => (
                          <CustomSwitch
                            id="switch-field-notify-on-cancel"
                            value={field.value ?? false}
                            isDisabled={!notificationsEnabled}
                            onChange={(v) =>
                              handleNotifyTargetChange("notifyOnCancel", v)
                            }
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
              </div>

              <div className="shrink-0 border-t bg-background px-6 py-4">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {!isCreate && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setIsDeleteOpen(true)}
                        disabled={isSaving}
                      >
                        <Trash2Icon className="h-4 w-4" />
                        Delete
                      </Button>
                    )}
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
                      disabled={isSaving}
                    >
                      {isCreate ? "Create" : "Update"}
                      {isSaving && (
                        <Loader2Icon className="ml-2 h-4 w-4 animate-spin" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
      {!isCreate && activeWorkflow && (
        <DeleteConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Delete workflow"
          description="This action cannot be undone. The workflow will be permanently removed."
          onConfirm={() => removeWorkflow(activeWorkflow.id)}
          onDeleted={() => {
            onClose()
            onDeleted?.()
          }}
          errorMessage="Failed to delete workflow. Please try again."
        />
      )}
    </>
  )
}
