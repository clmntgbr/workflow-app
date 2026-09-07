import { Paginate, PaginateQuery } from "@/lib/paginate"
import {
  CreateWorkflowConnectionInput,
  CreateWorkflowStepInput,
  CreateWorkflowInput,
  UpdateConditionWorkflowStepInput,
  UpdateDelayWorkflowStepInput,
  UpdateWorkflowInput,
  UpdateWorkflowStepInput,
  Workflow,
  WorkflowConnection,
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

async function readWorkflowErrorMessage(
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

export const listWorkflows = async (
  query?: PaginateQuery
): Promise<Paginate<Workflow>> => {
  const response = await fetch(`/api/workflows${buildQueryString(query)}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to list workflows")
  }

  return response.json()
}

export const createWorkflow = async (
  input: CreateWorkflowInput
): Promise<Workflow> => {
  const response = await fetch("/api/workflows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(
      await readWorkflowErrorMessage(response, "Failed to create workflow")
    )
  }

  return response.json()
}

function readWorkflowErrorPayload(payload: unknown): {
  code?: string
  message?: string
} {
  const record = asRecord(payload)
  const nested = asRecord(record?.data)
  const source = nested ?? record
  const code = source?.code
  const message = source?.message
  return {
    code: typeof code === "string" ? code : undefined,
    message:
      typeof message === "string" && message.trim() ? message : undefined,
  }
}

function unwrapWorkflowPayload(payload: unknown): unknown {
  const record = asRecord(payload)
  if (!record) return payload
  if (record.success === true && record.data !== undefined) return record.data
  return payload
}

export class WorkflowNotFoundError extends Error {
  constructor() {
    super("Workflow not found")
    this.name = "WorkflowNotFoundError"
  }
}

export class WorkflowImportError extends Error {
  readonly kind:
    | "invalid_json"
    | "unsupported_version"
    | "invalid_ref"
    | "quota"
    | "not_allowed"
  readonly status?: number
  readonly code?: string

  constructor(
    kind: WorkflowImportError["kind"],
    message: string,
    options?: { status?: number; code?: string }
  ) {
    super(message)
    this.name = "WorkflowImportError"
    this.kind = kind
    this.status = options?.status
    this.code = options?.code
  }
}

function readWorkflowErrorCode(payload: unknown): string | undefined {
  return readWorkflowErrorPayload(payload).code
}

export const getWorkflow = async (id: string): Promise<Workflow> => {
  const response = await fetch(`/api/workflows/${id}`, {
    method: "GET",
  })

  if (response.status === 404) {
    throw new WorkflowNotFoundError()
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const code = readWorkflowErrorCode(payload)

    if (code === "WRONG_PROJECT" || code === "WRONG_ORGANIZATION") {
      throw new WorkflowNotFoundError()
    }

    throw new Error("Failed to get workflow")
  }

  return response.json()
}

export const updateWorkflow = async (
  id: string,
  input: UpdateWorkflowInput
): Promise<Workflow> => {
  const response = await fetch(`/api/workflows/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(
      await readWorkflowErrorMessage(response, "Failed to update workflow")
    )
  }

  return response.json()
}

export const deleteWorkflow = async (id: string): Promise<void> => {
  const response = await fetch(`/api/workflows/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete workflow")
  }
}

export function slugifyWorkflowExportName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)

  return slug || "workflow"
}

export function downloadWorkflowExport(
  filename: string,
  payload: unknown
): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const exportWorkflow = async (id: string): Promise<unknown> => {
  const response = await fetch(`/api/workflows/${id}/export`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error(
      await readWorkflowErrorMessage(response, "Failed to export workflow")
    )
  }

  return unwrapWorkflowPayload(await response.json())
}

const INVALID_EXPORT_MESSAGE =
  "The selected file is not a valid workflow export."
const UNSUPPORTED_VERSION_MESSAGE =
  "This file was exported with a newer version of FlowForge and cannot be imported here."
const INVALID_REF_MESSAGE =
  "The file appears corrupted — some internal references are invalid."
const WORKFLOW_IMPORT_NOT_ALLOWED_MESSAGE =
  "Workflow import is not included in your plan."

function isUnsupportedExportVersion(code?: string): boolean {
  return (
    code === "UNSUPPORTED_EXPORT_VERSION" ||
    code === "UNSUPPORTED_VERSION" ||
    code === "EXPORT_VERSION_UNSUPPORTED"
  )
}

function isInvalidExportRef(code?: string): boolean {
  if (!code) return false
  return (
    code === "INVALID_REF" ||
    code === "INVALID_EXPORT_REF" ||
    code === "INVALID_INTERNAL_REF" ||
    code === "CORRUPTED_EXPORT"
  )
}

function isWorkflowImportNotAllowed(code?: string): boolean {
  if (!code) return false
  const normalized = code.toUpperCase().replace(/[.-]/g, "_")
  return (
    normalized.includes("ALLOWS_WORKFLOW_IMPORT") ||
    normalized.includes("WORKFLOW_IMPORT_NOT_ALLOWED") ||
    normalized.includes("WORKFLOW_IMPORT_DISABLED") ||
    normalized.includes("FEATURE_WORKFLOW_IMPORT")
  )
}

export function workflowImportErrorMessage(error: unknown): string {
  if (error instanceof WorkflowImportError) return error.message
  if (error instanceof Error && error.message.trim()) return error.message
  return "Failed to import workflow"
}

export const importWorkflow = async (payload: unknown): Promise<Workflow> => {
  const response = await fetch("/api/workflows/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const { code, message } = readWorkflowErrorPayload(body)

    if (isUnsupportedExportVersion(code)) {
      throw new WorkflowImportError(
        "unsupported_version",
        UNSUPPORTED_VERSION_MESSAGE,
        { status: response.status, code }
      )
    }

    if (isInvalidExportRef(code)) {
      throw new WorkflowImportError("invalid_ref", INVALID_REF_MESSAGE, {
        status: response.status,
        code,
      })
    }

    if (isWorkflowImportNotAllowed(code) || response.status === 403) {
      throw new WorkflowImportError(
        "not_allowed",
        message ?? WORKFLOW_IMPORT_NOT_ALLOWED_MESSAGE,
        { status: response.status, code }
      )
    }

    if (response.status === 409) {
      throw new WorkflowImportError(
        "quota",
        message ?? "Workflow quota exceeded",
        { status: 409, code }
      )
    }

    if (response.status === 400 || response.status === 422) {
      throw new WorkflowImportError("invalid_json", INVALID_EXPORT_MESSAGE, {
        status: response.status,
        code,
      })
    }

    throw new Error(message ?? "Failed to import workflow")
  }

  const created = unwrapWorkflowPayload(await response.json())
  const record = asRecord(created)
  const id = typeof record?.id === "string" ? record.id : null
  if (!id) {
    throw new Error("Failed to import workflow")
  }

  return created as Workflow
}

export async function readWorkflowExportFile(file: File): Promise<unknown> {
  const text = await file.text()
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new WorkflowImportError("invalid_json", INVALID_EXPORT_MESSAGE)
    }
    return parsed
  } catch (error) {
    if (error instanceof WorkflowImportError) throw error
    throw new WorkflowImportError("invalid_json", INVALID_EXPORT_MESSAGE)
  }
}

export const createWorkflowStep = async (
  workflowId: string,
  input: CreateWorkflowStepInput
): Promise<unknown> => {
  const body =
    input.type === "delay"
      ? {
          type: "delay",
          delayDurationSeconds: input.delayDurationSeconds,
          position: input.position,
          ...(input.name ? { name: input.name } : {}),
          ...(input.description ? { description: input.description } : {}),
        }
      : input.type === "condition"
        ? {
            type: "condition",
            expression: input.expression,
            position: input.position,
            ...(input.name ? { name: input.name } : {}),
            ...(input.description ? { description: input.description } : {}),
          }
        : {
            type: "http",
            endpointId: input.endpointId,
            position: input.position,
          }

  const response = await fetch(`/api/workflows/${workflowId}/steps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(
      await readWorkflowErrorMessage(response, "Failed to create workflow step")
    )
  }

  return response.json()
}

export const updateDelayWorkflowStep = async (
  workflowId: string,
  stepId: string,
  input: UpdateDelayWorkflowStepInput
): Promise<unknown> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/steps/${stepId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "delay",
        name: input.name,
        description: input.description ?? "",
        delayDurationSeconds: input.delayDurationSeconds,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(
      await readWorkflowErrorMessage(response, "Failed to update delay step")
    )
  }

  return response.json()
}

export const updateConditionWorkflowStep = async (
  workflowId: string,
  stepId: string,
  input: UpdateConditionWorkflowStepInput
): Promise<unknown> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/steps/${stepId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "condition",
        name: input.name,
        description: input.description ?? "",
        expression: input.expression,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(
      await readWorkflowErrorMessage(response, "Failed to update condition step")
    )
  }

  return response.json()
}

export const updateWorkflowStep = async (
  workflowId: string,
  stepId: string,
  input: UpdateWorkflowStepInput
): Promise<unknown> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/steps/${stepId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        description: input.description ?? "",
        url: input.url,
        method: input.method,
        headers: input.headers ?? {},
        query: input.query ?? {},
        body: input.body ?? {},
        timeout: input.timeout,
        retryOnFailure: input.retryOnFailure,
        retryCount: input.retryCount,
        retryDelay: input.retryDelay,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(
      await readWorkflowErrorMessage(response, "Failed to update workflow step")
    )
  }

  return response.json()
}

export const deleteWorkflowStep = async (
  workflowId: string,
  stepId: string
): Promise<void> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/steps/${stepId}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    throw new Error("Failed to delete workflow step")
  }
}

export const updateStepPosition = async (
  workflowId: string,
  stepId: string,
  input: { position: { x: number; y: number } }
): Promise<unknown> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/steps/${stepId}/position`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )

  if (!response.ok) {
    throw new Error("Failed to update step position")
  }

  return response.json()
}

export const getWorkflowSteps = async (workflowId: string): Promise<unknown> => {
  const response = await fetch(`/api/workflows/${workflowId}/steps`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to get workflow steps")
  }

  return response.json()
}

export const getWorkflowStep = async (
  workflowId: string,
  stepId: string
): Promise<unknown> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/steps/${stepId}`,
    {
      method: "GET",
    }
  )

  if (!response.ok) {
    throw new Error("Failed to get workflow step")
  }

  return response.json()
}

function parseWorkflowConnection(payload: unknown): WorkflowConnection {
  const record = asRecord(payload)
  const nested = asRecord(record?.data)
  const source = nested ?? record
  if (!source) {
    throw new Error("Invalid workflow connection response")
  }

  const id =
    typeof source.id === "string"
      ? source.id
      : typeof source.connectionId === "string"
        ? source.connectionId
        : typeof source.connection_id === "string"
          ? source.connection_id
          : null
  const sourceStepId =
    typeof source.sourceStepId === "string"
      ? source.sourceStepId
      : typeof source.source_step_id === "string"
        ? source.source_step_id
        : null
  const targetStepId =
    typeof source.targetStepId === "string"
      ? source.targetStepId
      : typeof source.target_step_id === "string"
        ? source.target_step_id
        : null

  if (!id || !sourceStepId || !targetStepId) {
    throw new Error("Invalid workflow connection response")
  }

  const branchRaw = source.branch
  const branch =
    branchRaw === "true" || branchRaw === "false"
      ? branchRaw
      : branchRaw === null
        ? null
        : null

  return { id, sourceStepId, targetStepId, branch }
}

export const createWorkflowConnection = async (
  workflowId: string,
  input: CreateWorkflowConnectionInput
): Promise<WorkflowConnection> => {
  const response = await fetch(`/api/workflows/${workflowId}/connections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(
      await readWorkflowErrorMessage(
        response,
        "Failed to create workflow connection"
      )
    )
  }

  const payload: unknown = await response.json()
  return parseWorkflowConnection(payload)
}

export const getWorkflowConnections = async (
  workflowId: string
): Promise<unknown> => {
  const response = await fetch(`/api/workflows/${workflowId}/connections`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to get workflow connections")
  }

  return response.json()
}

export const deleteWorkflowConnection = async (
  workflowId: string,
  connectionId: string
): Promise<void> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/connections/${connectionId}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    throw new Error("Failed to delete workflow connection")
  }
}
