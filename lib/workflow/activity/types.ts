export type WorkflowActivityLevel =
  | "debug"
  | "info"
  | "notice"
  | "warning"
  | "error"
  | "critical"

export interface WorkflowActivityEntry {
  id: string
  occurredAt: string
  level: WorkflowActivityLevel
  action: string
  message: string
  workflowId: string | null
  subjectType: string | null
  subjectId: string | null
  workflowRunId: string | null
  stepId: string | null
  stepRunId: string | null
  actorType: string | null
  actorUserId: string | null
  sourceEventType: string | null
  url: string | null
  payload: unknown
}

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
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

const LEVELS = new Set<WorkflowActivityLevel>([
  "debug",
  "info",
  "notice",
  "warning",
  "error",
  "critical",
])

function parseLevel(value: string | null): WorkflowActivityLevel {
  if (value && LEVELS.has(value as WorkflowActivityLevel)) {
    return value as WorkflowActivityLevel
  }
  return "info"
}

function formatMetadata(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return null
    }
  }
  return String(value)
}

function pickUrlFromPayload(payload: unknown): string | null {
  const record = asRecord(payload)
  if (!record) return null

  const direct = pickString(record, ["url", "URL", "requestUrl", "request_url"])
  if (direct) return direct

  for (const key of ["request", "requestSnapshot", "responseSnapshot"]) {
    const nested = asRecord(record[key])
    const nestedUrl = nested
      ? pickString(nested, ["url", "URL", "requestUrl", "request_url"])
      : null
    if (nestedUrl) return nestedUrl
  }

  return null
}

export function normalizeWorkflowActivityEntry(
  raw: unknown
): WorkflowActivityEntry | null {
  const record = asRecord(raw)
  if (!record) return null

  const nested = asRecord(record.data)
  const source = nested ?? record

  const id = pickString(source, ["id"])
  const occurredAt = pickString(source, ["occurredAt", "occurred_at"])
  if (!id || !occurredAt) return null

  const action =
    pickString(source, [
      "action",
      "type",
      "event",
      "eventType",
      "event_type",
      "name",
    ]) ?? "activity"

  const message =
    pickString(source, ["message", "description", "content", "summary"]) ??
    formatMetadata(source.payload ?? source.context ?? source.metadata) ??
    action

  const payload = source.payload ?? source.context ?? source.metadata ?? null

  return {
    id,
    occurredAt,
    level: parseLevel(
      pickString(source, ["level", "severity", "logLevel", "log_level"])
    ),
    action,
    message,
    workflowId: pickString(source, ["workflowId", "workflow_id"]),
    subjectType: pickString(source, ["subjectType", "subject_type"]),
    subjectId: pickString(source, ["subjectId", "subject_id"]),
    workflowRunId: pickString(source, ["workflowRunId", "workflow_run_id"]),
    stepId: pickString(source, ["stepId", "step_id"]),
    stepRunId: pickString(source, ["stepRunId", "step_run_id"]),
    actorType: pickString(source, ["actorType", "actor_type"]),
    actorUserId: pickString(source, ["actorUserId", "actor_user_id"]),
    sourceEventType: pickString(source, [
      "sourceEventType",
      "source_event_type",
    ]),
    url: pickUrlFromPayload(payload),
    payload,
  }
}

export function formatActivityTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function getActivityLevelClass(level: WorkflowActivityLevel): string {
  switch (level) {
    case "debug":
      return "text-slate-500"
    case "info":
      return "text-sky-600"
    case "notice":
      return "text-indigo-600"
    case "warning":
      return "text-amber-600"
    case "error":
      return "text-rose-600"
    case "critical":
      return "font-semibold text-rose-700"
    default:
      return "text-muted-foreground"
  }
}

export function getActivityLevelClassDark(level: WorkflowActivityLevel): string {
  switch (level) {
    case "debug":
      return "text-slate-500"
    case "info":
      return "text-sky-400"
    case "notice":
      return "text-indigo-400"
    case "warning":
      return "text-amber-400"
    case "error":
      return "text-rose-400"
    case "critical":
      return "font-semibold text-rose-300"
    default:
      return "text-slate-400"
  }
}

export function getActivityEntryDetails(entry: WorkflowActivityEntry) {
  return {
    id: entry.id,
    workflowId: entry.workflowId,
    url: entry.url,
    subjectType: entry.subjectType,
    subjectId: entry.subjectId,
    workflowRunId: entry.workflowRunId,
    stepId: entry.stepId,
    stepRunId: entry.stepRunId,
    actorType: entry.actorType,
    actorUserId: entry.actorUserId,
    sourceEventType: entry.sourceEventType,
    payload: entry.payload,
  }
}
