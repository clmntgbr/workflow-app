import * as z from "zod"
import {
  CreateWorkflowInput,
  ScheduleType,
  ScheduleUnit,
  UpdateWorkflowInput,
  Workflow,
} from "./types"
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

export const emptyWorkflowFormValues: WorkflowFormValues = {
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

const SCHEDULE_TYPES: ScheduleType[] = ["none", "recurring", "once"]
const SCHEDULE_UNITS: ScheduleUnit[] = [
  "minute",
  "hour",
  "day",
  "week",
  "month",
  "year",
]

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function pickString(
  record: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string") return value
  }
  return null
}

function pickNumber(
  record: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
  }
  return null
}

function pickBoolean(
  record: Record<string, unknown>,
  keys: string[]
): boolean | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "boolean") return value
  }
  return null
}

export function getWorkflowFormValues(
  workflow?: Workflow | null
): WorkflowFormValues {
  if (!workflow) return emptyWorkflowFormValues

  const scheduleType = SCHEDULE_TYPES.includes(
    workflow.scheduleType as ScheduleType
  )
    ? (workflow.scheduleType as ScheduleType)
    : "none"

  return {
    name: workflow.name,
    description: workflow.description ?? "",
    scheduleType,
    scheduleIntervalValue: workflow.scheduleIntervalValue || 1,
    scheduleIntervalUnit: SCHEDULE_UNITS.includes(
      workflow.scheduleIntervalUnit as ScheduleUnit
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

export function getWorkflowFormValuesFromExport(
  payload: unknown
): WorkflowFormValues {
  const root = asRecord(payload)
  if (!root) return emptyWorkflowFormValues
  const source = asRecord(root.workflow) ?? root

  const scheduleTypeRaw = pickString(source, ["scheduleType", "schedule_type"])
  const scheduleUnitRaw = pickString(source, [
    "scheduleIntervalUnit",
    "schedule_interval_unit",
  ])

  return {
    name: pickString(source, ["name"]) ?? "",
    description: pickString(source, ["description"]) ?? "",
    scheduleType: SCHEDULE_TYPES.includes(scheduleTypeRaw as ScheduleType)
      ? (scheduleTypeRaw as ScheduleType)
      : "none",
    scheduleIntervalValue:
      pickNumber(source, [
        "scheduleIntervalValue",
        "schedule_interval_value",
      ]) || 1,
    scheduleIntervalUnit: SCHEDULE_UNITS.includes(
      scheduleUnitRaw as ScheduleUnit
    )
      ? (scheduleUnitRaw as ScheduleUnit)
      : "hour",
    scheduleAt: toDatetimeLocalValue(
      pickString(source, ["scheduleAt", "schedule_at"])
    ),
    notificationsEnabled:
      pickBoolean(source, [
        "notificationsEnabled",
        "notifications_enabled",
      ]) ?? false,
    notifyOnSuccess:
      pickBoolean(source, ["notifyOnSuccess", "notify_on_success"]) ?? false,
    notifyOnFailure:
      pickBoolean(source, ["notifyOnFailure", "notify_on_failure"]) ?? false,
    notifyOnCancel:
      pickBoolean(source, ["notifyOnCancel", "notify_on_cancel"]) ?? false,
  }
}

export function applyWorkflowFormToExport(
  payload: unknown,
  values: WorkflowFormValues
): unknown {
  const create = toCreateWorkflowPayload(values)
  const root = asRecord(payload)
  if (!root) return payload

  const nested = asRecord(root.workflow)
  if (nested) {
    return {
      ...root,
      workflow: {
        ...nested,
        ...create,
      },
    }
  }

  return {
    ...root,
    ...create,
  }
}

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
  current: { concurrency: number }
): UpdateWorkflowInput {
  const schedule = toSchedulePayload(values)

  return {
    name: values.name,
    description: values.description ?? "",
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

export type WorkflowScheduleResume = {
  scheduleType: "recurring" | "once"
  scheduleIntervalValue: number
  scheduleIntervalUnit: ScheduleUnit | ""
  scheduleAt: string | null
  scheduleTimezone: string
}

export function getWorkflowScheduleResume(
  workflow: Workflow
): WorkflowScheduleResume | null {
  if (workflow.scheduleType !== "recurring" && workflow.scheduleType !== "once") {
    return null
  }

  return {
    scheduleType: workflow.scheduleType,
    scheduleIntervalValue: workflow.scheduleIntervalValue || 1,
    scheduleIntervalUnit:
      workflow.scheduleType === "recurring"
        ? ((workflow.scheduleIntervalUnit as ScheduleUnit) || "hour")
        : "",
    scheduleAt: workflow.scheduleAt,
    scheduleTimezone: workflow.scheduleTimezone || "UTC",
  }
}

export function toUpdateWorkflowPayloadFromWorkflow(
  workflow: Workflow,
  schedule: {
    scheduleType: ScheduleType
    scheduleIntervalValue: number
    scheduleIntervalUnit: ScheduleUnit | ""
    scheduleAt: string | null
    scheduleTimezone?: string
  }
): UpdateWorkflowInput {
  return {
    name: workflow.name,
    description: workflow.description ?? "",
    scheduleType: schedule.scheduleType,
    scheduleIntervalValue: schedule.scheduleIntervalValue,
    scheduleIntervalUnit: schedule.scheduleIntervalUnit,
    scheduleAt: schedule.scheduleAt,
    scheduleTimezone: schedule.scheduleTimezone || workflow.scheduleTimezone || "UTC",
    concurrency: workflow.concurrency,
    notificationsEnabled: workflow.notificationsEnabled,
    notifyOnSuccess: workflow.notifyOnSuccess,
    notifyOnFailure: workflow.notifyOnFailure,
    notifyOnCancel: workflow.notifyOnCancel,
  }
}
