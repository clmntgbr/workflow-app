import { Paginate, PaginateQuery } from "@/lib/paginate"
import { WorkflowRun, WorkflowRunAnalytics, WorkflowRunDetail } from "./types"

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

  return response.json()
}
