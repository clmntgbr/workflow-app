import * as z from "zod"
import { CreateWorkflowInput, UpdateWorkflowInput } from "./types"
import { hasNotificationTarget } from "./utils"

const MIN_SCHEDULE_INTERVAL_MINUTES = 1

const scheduleTypeSchema = z.enum(["none", "recurring", "once"])
const scheduleUnitSchema = z.enum([
  "minute",
  "hour",
  "day",
  "week",
  "month",
  "year",
])

function intervalToMinutes(value: number, unit: string): number {
  switch (unit) {
    case "minute":
      return value
    case "hour":
      return value * 60
    case "day":
      return value * 60 * 24
    case "week":
      return value * 60 * 24 * 7
    case "month":
      return value * 60 * 24 * 30
    case "year":
      return value * 60 * 24 * 365
    default:
      return 0
  }
}

export const workflowSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be at most 100 characters"),
    description: z
      .string()
      .max(255, "Description must be at most 255 characters")
      .optional(),
    scheduleType: scheduleTypeSchema,
    scheduleIntervalValue: z.number().int().min(1).optional(),
    scheduleIntervalUnit: scheduleUnitSchema.or(z.literal("")).optional(),
    scheduleAt: z.string().optional(),
    notificationsEnabled: z.boolean(),
    notifyOnSuccess: z.boolean(),
    notifyOnFailure: z.boolean(),
    notifyOnCancel: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.notificationsEnabled && !hasNotificationTarget(data)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Select at least one notification event when notifications are enabled",
        path: ["notificationsEnabled"],
      })
    }

    if (data.scheduleType === "recurring") {
      if (!data.scheduleIntervalValue || data.scheduleIntervalValue < 1) {
        ctx.addIssue({
          code: "custom",
          message: "Interval is required",
          path: ["scheduleIntervalValue"],
        })
      }
      if (!data.scheduleIntervalUnit) {
        ctx.addIssue({
          code: "custom",
          message: "Interval unit is required",
          path: ["scheduleIntervalUnit"],
        })
      } else if (
        data.scheduleIntervalValue &&
        intervalToMinutes(
          data.scheduleIntervalValue,
          data.scheduleIntervalUnit
        ) < MIN_SCHEDULE_INTERVAL_MINUTES
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Interval must be at least 1 minute",
          path: ["scheduleIntervalValue"],
        })
      }
    }

    if (data.scheduleType === "once" && !data.scheduleAt) {
      ctx.addIssue({
        code: "custom",
        message: "A date and time are required",
        path: ["scheduleAt"],
      })
    }
  })

export type WorkflowFormValues = z.infer<typeof workflowSchema>

export function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""

  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDatetimeLocalValue(value?: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function toSchedulePayload(values: WorkflowFormValues) {
  const scheduleType = values.scheduleType

  return {
    scheduleType,
    scheduleIntervalValue:
      scheduleType === "recurring" ? (values.scheduleIntervalValue ?? 1) : 0,
    scheduleIntervalUnit:
      scheduleType === "recurring"
        ? (values.scheduleIntervalUnit || "hour")
        : ("" as const),
    scheduleAt:
      scheduleType === "once" ? fromDatetimeLocalValue(values.scheduleAt) : null,
    scheduleTimezone: "UTC",
  }
}

export function toCreateWorkflowPayload(
  values: WorkflowFormValues
): CreateWorkflowInput {
  return {
    name: values.name,
    description: values.description ?? "",
    ...toSchedulePayload(values),
    notificationsEnabled: values.notificationsEnabled,
    notifyOnSuccess: values.notifyOnSuccess,
    notifyOnFailure: values.notifyOnFailure,
    notifyOnCancel: values.notifyOnCancel,
  }
}

export function toUpdateWorkflowPayload(
  values: WorkflowFormValues,
  current: { status: string; concurrency: number }
): UpdateWorkflowInput {
  const schedule = toSchedulePayload(values)

  return {
    name: values.name,
    description: values.description ?? "",
    status: current.status,
    scheduleType: schedule.scheduleType,
    scheduleIntervalValue: schedule.scheduleIntervalValue,
    scheduleIntervalUnit: schedule.scheduleIntervalUnit,
    scheduleAt: schedule.scheduleAt,
    scheduleTimezone: schedule.scheduleTimezone,
    concurrency: current.concurrency,
    notificationsEnabled: values.notificationsEnabled,
    notifyOnSuccess: values.notifyOnSuccess,
    notifyOnFailure: values.notifyOnFailure,
    notifyOnCancel: values.notifyOnCancel,
  }
}
