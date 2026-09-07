"use client"

import CustomInput from "@/components/custom-input"
import CustomSwitch from "@/components/custom-switch"
import CustomTextarea from "@/components/custom-textarea"
import { DateTimePicker } from "@/components/date-time-picker"
import { RadioDropdown } from "@/components/radio-dropdown"
import { Field } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { WorkflowFormValues } from "@/lib/workflow/schema"
import { ScheduleType, ScheduleUnit } from "@/lib/workflow/types"
import { hasNotificationTarget } from "@/lib/workflow/utils"
import {
  Control,
  Controller,
  FieldErrors,
  UseFormSetValue,
  useWatch,
} from "react-hook-form"

const SCHEDULE_TYPES: { value: ScheduleType; label: string }[] = [
  { value: "none", label: "None" },
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

interface WorkflowFormFieldsProps {
  control: Control<WorkflowFormValues>
  errors: FieldErrors<WorkflowFormValues>
  setValue: UseFormSetValue<WorkflowFormValues>
  idPrefix?: string
  nextRunAt?: string | null
}

export function WorkflowFormFields({
  control,
  errors,
  setValue,
  idPrefix = "workflow",
  nextRunAt,
}: WorkflowFormFieldsProps) {
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

  return (
    <>
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
                  id={`${idPrefix}-name`}
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
                  id={`${idPrefix}-description`}
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
                  <Label htmlFor={`${idPrefix}-schedule-type`}>Type</Label>
                  <RadioDropdown
                    id={`${idPrefix}-schedule-type`}
                    value={
                      SCHEDULE_TYPES.find(
                        (type) => type.value === field.value
                      ) ?? SCHEDULE_TYPES[0]
                    }
                    onValueChange={(type) => field.onChange(type.value)}
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
                      id={`${idPrefix}-schedule-interval-value`}
                      isRequired
                      label="Every"
                      hasError={!!errors.scheduleIntervalValue}
                      errorMessage={errors.scheduleIntervalValue?.message}
                      description="Minimum interval is 1 minute"
                      value={String(field.value ?? 1)}
                      onChange={(value) =>
                        field.onChange(Number.parseInt(value || "1", 10))
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
                      <Label htmlFor={`${idPrefix}-schedule-interval-unit`}>
                        Unit
                      </Label>
                      <RadioDropdown
                        id={`${idPrefix}-schedule-interval-unit`}
                        value={
                          SCHEDULE_UNITS.find(
                            (unit) => unit.value === field.value
                          ) ?? SCHEDULE_UNITS[0]
                        }
                        onValueChange={(unit) => field.onChange(unit.value)}
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
                  <DateTimePicker
                    id={`${idPrefix}-schedule-at`}
                    label="Run at"
                    required
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    hasError={Boolean(errors.scheduleAt)}
                    errorMessage={errors.scheduleAt?.message}
                    description="Exact date and time in your local timezone"
                  />
                )}
              />
            </Field>
          ) : null}

          {scheduleType !== "none" && nextRunAt ? (
            <div className="space-y-1 rounded-lg border px-3 py-2">
              <p className="text-xs text-muted-foreground">Next run</p>
              <p className="text-sm">{new Date(nextRunAt).toLocaleString()}</p>
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
                htmlFor={`${idPrefix}-notifications-enabled`}
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
                    id={`${idPrefix}-notifications-enabled`}
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
                htmlFor={`${idPrefix}-notify-on-success`}
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
                    id={`${idPrefix}-notify-on-success`}
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
                htmlFor={`${idPrefix}-notify-on-failure`}
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
                    id={`${idPrefix}-notify-on-failure`}
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
                htmlFor={`${idPrefix}-notify-on-cancel`}
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
                    id={`${idPrefix}-notify-on-cancel`}
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
    </>
  )
}
