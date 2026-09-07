import { Paginate, PaginateQuery } from "@/lib/paginate"
import {
  WORKFLOW_RUNS_EXPORT_STATUSES,
  WorkflowRun,
  WorkflowRunAnalytics,
  WorkflowRunDetail,
  WorkflowRunsExportInput,
  WorkflowRunsExportJob,
  WorkflowRunsExportStatus,
} from "./types"

function buildQueryString(query?: PaginateQuery): string {
  if (!query) return ""

  const params = new URLSearchParams()
  if (query.page != null) params.set("page", String(query.page))
  if (query.limit != null) params.set("limit", String(query.limit))
  if (query.sortBy) params.set("sortBy", query.sortBy)
  if (query.orderBy) params.set("orderBy", query.orderBy)
  if (query.search) params.set("search", query.search)

  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

export class WorkflowRunConflictError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "WorkflowRunConflictError"
    this.code = code
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

async function readWorkflowRunErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data: unknown = await response.json()
    const record = asRecord(data)
    const nested = asRecord(record?.data)
    const message = nested?.message ?? record?.message
    if (typeof message === "string" && message.trim()) return message
  } catch {
    // Ignore unreadable error bodies.
  }
  return fallback
}

async function readConflictFromResponse(
  response: Response
): Promise<WorkflowRunConflictError | null> {
  if (response.status !== 409) return null

  try {
    const body = (await response.json()) as unknown
    const envelope = asRecord(body)
    const payload = asRecord(envelope?.data) ?? envelope

    const code =
      typeof payload?.code === "string"
        ? payload.code
        : typeof payload?.error === "string"
          ? payload.error
          : undefined
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : "Workflow run conflict"

    if (code) {
      return new WorkflowRunConflictError(code, message)
    }
  } catch {
    // fall through
  }

  return new WorkflowRunConflictError("CONFLICT", "Workflow run conflict")
}

export function isWorkflowRunInProgress(status: string): boolean {
  return status === "pending" || status === "running"
}

export const startWorkflowRun = async (
  workflowId: string,
  context?: Record<string, unknown>
): Promise<WorkflowRun> => {
  const response = await fetch(`/api/workflows/${workflowId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(context ? { context } : {}),
  })

  const conflict = await readConflictFromResponse(response)
  if (conflict) throw conflict

  if (!response.ok) {
    throw new Error(
      await readWorkflowRunErrorMessage(response, "Failed to start workflow run")
    )
  }

  return response.json()
}

export const stopWorkflowRun = async (
  workflowId: string
): Promise<WorkflowRun> => {
  const response = await fetch(`/api/workflows/${workflowId}/stop`, {
    method: "POST",
  })

  const conflict = await readConflictFromResponse(response)
  if (conflict) throw conflict

  if (!response.ok) {
    throw new Error(
      await readWorkflowRunErrorMessage(response, "Failed to stop workflow run")
    )
  }

  return response.json()
}

export const getActiveWorkflowRun = async (
  workflowId: string
): Promise<WorkflowRun | null> => {
  const list = await listWorkflowRunsByWorkflow(workflowId, {
    page: 1,
    limit: 1,
    orderBy: "desc",
  })

  const latest = list.members[0]
  if (!latest || !isWorkflowRunInProgress(latest.status)) return null
  return latest
}

export const listWorkflowRunsByWorkflow = async (
  workflowId: string,
  query?: PaginateQuery
): Promise<Paginate<WorkflowRun>> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/runs${buildQueryString(query)}`,
    {
      method: "GET",
    }
  )

  if (!response.ok) {
    throw new Error("Failed to list workflow runs")
  }

  return response.json()
}

export const getWorkflowRunAnalytics = async (
  workflowId: string
): Promise<WorkflowRunAnalytics> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/runs/analytics`,
    {
      method: "GET",
    }
  )

  if (!response.ok) {
    throw new Error("Failed to load analytics")
  }

  return response.json()
}

export const getWorkflowRun = async (
  workflowId: string,
  runId: string
): Promise<WorkflowRunDetail> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/runs/${runId}`,
    {
      method: "GET",
    }
  )

  if (!response.ok) {
    throw new Error("Failed to get workflow run")
  }

  const payload = unwrapPayload(await response.json())
  const record = asRecord(payload)
  if (!record) {
    throw new Error("Failed to get workflow run")
  }

  return {
    ...(payload as WorkflowRunDetail),
    stepRuns: Array.isArray(record.stepRuns) ? record.stepRuns : [],
  } as WorkflowRunDetail
}

export type WorkflowRunsExportErrorKind =
  | "unauthorized"
  | "forbidden"
  | "invalid_range"
  | "invalid_body"
  | "not_found"
  | "failed"
  | "generic"

export class WorkflowRunsExportError extends Error {
  readonly kind: WorkflowRunsExportErrorKind
  readonly status?: number

  constructor(
    kind: WorkflowRunsExportErrorKind,
    message: string,
    status?: number
  ) {
    super(message)
    this.name = "WorkflowRunsExportError"
    this.kind = kind
    this.status = status
  }
}

function unwrapPayload(payload: unknown): unknown {
  const record = asRecord(payload)
  if (record?.success === true && record.data !== undefined) return record.data
  return payload
}

function isWorkflowRunsExportStatus(
  value: unknown
): value is WorkflowRunsExportStatus {
  return (
    typeof value === "string" &&
    (WORKFLOW_RUNS_EXPORT_STATUSES as readonly string[]).includes(value)
  )
}

function parseWorkflowRunsExportJob(payload: unknown): WorkflowRunsExportJob {
  const record = asRecord(unwrapPayload(payload))
  if (!record || typeof record.id !== "string") {
    throw new WorkflowRunsExportError(
      "generic",
      "Invalid export response"
    )
  }

  if (!isWorkflowRunsExportStatus(record.status)) {
    throw new WorkflowRunsExportError(
      "generic",
      "Invalid export response"
    )
  }

  return {
    id: record.id,
    status: record.status,
    from: typeof record.from === "string" ? record.from : null,
    to: typeof record.to === "string" ? record.to : null,
    error: typeof record.error === "string" ? record.error : null,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
  }
}

function mapWorkflowRunsExportHttpError(
  status: number,
  message?: string
): WorkflowRunsExportError {
  const fallbackMessage = message?.trim()
  const normalized = (fallbackMessage ?? "").toLowerCase()

  if (status === 401) {
    return new WorkflowRunsExportError(
      "unauthorized",
      fallbackMessage || "Unauthorized",
      status
    )
  }

  if (status === 403) {
    return new WorkflowRunsExportError(
      "forbidden",
      fallbackMessage || "data export is not available on your current plan",
      status
    )
  }

  if (status === 404) {
    return new WorkflowRunsExportError(
      "not_found",
      fallbackMessage || "Workflow / export not found",
      status
    )
  }

  if (status === 400) {
    if (normalized.includes("invalid export date range")) {
      return new WorkflowRunsExportError(
        "invalid_range",
        fallbackMessage || "invalid export date range",
        status
      )
    }

    return new WorkflowRunsExportError(
      "invalid_body",
      fallbackMessage || "Invalid request body",
      status
    )
  }

  return new WorkflowRunsExportError(
    "generic",
    fallbackMessage || "Failed to export workflow runs",
    status
  )
}

async function throwWorkflowRunsExportError(
  response: Response,
  fallback: string
): Promise<never> {
  const message = await readWorkflowRunErrorMessage(response, fallback)
  throw mapWorkflowRunsExportHttpError(response.status, message)
}

export const startWorkflowRunsExport = async (
  workflowId: string,
  input?: WorkflowRunsExportInput,
  signal?: AbortSignal
): Promise<WorkflowRunsExportJob> => {
  const body: WorkflowRunsExportInput = {}
  if (input?.from) body.from = input.from
  if (input?.to) body.to = input.to

  const response = await fetch(`/api/workflows/${workflowId}/runs/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    await throwWorkflowRunsExportError(
      response,
      "Failed to start workflow runs export"
    )
  }

  return parseWorkflowRunsExportJob(await response.json())
}
