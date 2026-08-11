"use client"

import CustomInput from "@/components/custom-input"
import CustomSwitch from "@/components/custom-switch"
import CustomTextarea from "@/components/custom-textarea"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Field } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useWorkflow } from "@/lib/workflow/context"
import { workflowSchema } from "@/lib/workflow/schema"
import { Workflow } from "@/lib/workflow/types"
import { hasNotificationTarget } from "@/lib/workflow/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import z from "zod"

type WorkflowFormValues = z.infer<typeof workflowSchema>

const emptyFormValues: WorkflowFormValues = {
  name: "",
  description: "",
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

  return {
    name: workflow.name,
    description: workflow.description ?? "",
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

  const {
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowSchema),
    defaultValues: getWorkflowFormValues(workflow),
  })

  const notificationsEnabled = useWatch({
    control,
    name: "notificationsEnabled",
  })
  const notifyOnSuccess = useWatch({ control, name: "notifyOnSuccess" })
  const notifyOnFailure = useWatch({ control, name: "notifyOnFailure" })
  const notifyOnCancel = useWatch({ control, name: "notifyOnCancel" })

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

  const onClose = () => {
    reset(getWorkflowFormValues(workflow))
    onOpenChange(false)
  }

  const onSubmit = async (data: WorkflowFormValues) => {
    setIsSaving(true)
    try {
      if (isCreate) {
        const created = await createWorkflow({
          name: data.name,
          description: data.description ?? "",
          notificationsEnabled: data.notificationsEnabled,
          notifyOnSuccess: data.notifyOnSuccess,
          notifyOnFailure: data.notifyOnFailure,
          notifyOnCancel: data.notifyOnCancel,
        })
        onSaved?.(created)
      } else {
        const updated = await updateWorkflow(workflow.id, {
          name: data.name,
          description: data.description ?? "",
          status: workflow.status,
          scheduleIntervalMinutes: workflow.scheduleIntervalMinutes,
          concurrency: workflow.concurrency,
          notificationsEnabled: data.notificationsEnabled,
          notifyOnSuccess: data.notifyOnSuccess,
          notifyOnFailure: data.notifyOnFailure,
          notifyOnCancel: data.notifyOnCancel,
        })
        onSaved?.(updated)
      }
      onClose()
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

  useEffect(() => {
    if (isOpen) {
      reset(getWorkflowFormValues(workflow))
    }
  }, [isOpen, workflow, reset])

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
      {!isCreate && workflow && (
        <DeleteConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Delete workflow"
          description="This action cannot be undone. The workflow will be permanently removed."
          onConfirm={() => removeWorkflow(workflow.id)}
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
