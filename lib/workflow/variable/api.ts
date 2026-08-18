import { Paginate, PaginateQuery } from "@/lib/paginate"
import {
  CreateWorkflowVariableInput,
  UpdateWorkflowVariableInput,
  VariableInUseError,
  VariableUsageStep,
  WorkflowVariable,
} from "./types"

function buildQueryString(query?: PaginateQuery): string {
  if (!query) return ""

  const params = new URLSearchParams()
  if (query.page != null) params.set("page", String(query.page))
  if (query.limit != null) params.set("limit", String(query.limit))
  if (query.search) params.set("search", query.search)

  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function unwrapErrorPayload(data: unknown): Record<string, unknown> | null {
  const record = asRecord(data)
  if (!record) return null
  const nested = asRecord(record.data)
  return nested ?? record
}

function errorMessageFromBody(data: unknown, fallback: string): string {
  const payload = unwrapErrorPayload(data)
  const nestedMessage = payload?.message
  if (typeof nestedMessage === "string" && nestedMessage.trim()) {
    return nestedMessage
  }
  return fallback
}

function parseUsageStep(item: unknown): VariableUsageStep | null {
  const record = asRecord(item)
  if (!record) return null

  const id = typeof record.id === "string" ? record.id : null
  const name = typeof record.name === "string" ? record.name : null
  if (!id || !name) return null

  return {
    id,
    endpointId:
      typeof record.endpointId === "string" ? record.endpointId : "",
    name,
    url: typeof record.url === "string" ? record.url : "",
    method: typeof record.method === "string" ? record.method : "",
  }
}

function parseVariableInUseError(data: unknown): VariableInUseError | null {
  const payload = unwrapErrorPayload(data)
  if (!payload || !Array.isArray(payload.steps)) return null

  const steps = payload.steps
    .map(parseUsageStep)
    .filter((step): step is VariableUsageStep => step !== null)

  if (steps.length === 0) return null

  return new VariableInUseError(
    errorMessageFromBody(data, "Variable is used by one or more steps"),
    steps
  )
}

async function readErrorBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function readErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  return errorMessageFromBody(await readErrorBody(response), fallback)
}

export async function listWorkflowVariables(
  workflowId: string
): Promise<WorkflowVariable[]> {
  const response = await fetch(`/api/workflows/${workflowId}/variables`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to list variables")
    )
  }

  const data = await response.json()
  return Array.isArray(data) ? data : []
}

export async function listAvailableVariables(
  workflowId: string,
  stepId: string
): Promise<WorkflowVariable[]> {
  const response = await fetch(
    `/api/workflows/${workflowId}/steps/${stepId}/variables`,
    {
      method: "GET",
    }
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to list available variables")
    )
  }

  const data = await response.json()
  return Array.isArray(data) ? data : []
}

export async function listStepVariablePaths(
  workflowId: string,
  stepId: string,
  query?: PaginateQuery
): Promise<Paginate<string>> {
  const response = await fetch(
    `/api/workflows/${workflowId}/steps/${stepId}/variable-paths${buildQueryString(query)}`,
    {
      method: "GET",
    }
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to list variable paths")
    )
  }

  return response.json()
}

export async function getWorkflowVariable(
  workflowId: string,
  variableId: string
): Promise<WorkflowVariable> {
  const response = await fetch(
    `/api/workflows/${workflowId}/variables/${variableId}`,
    {
      method: "GET",
    }
  )

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to get variable"))
  }

  return response.json()
}

export async function createWorkflowVariable(
  workflowId: string,
  input: CreateWorkflowVariableInput
): Promise<WorkflowVariable> {
  const response = await fetch(`/api/workflows/${workflowId}/variables`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to create variable")
    )
  }

  return response.json()
}

export async function updateWorkflowVariable(
  workflowId: string,
  variableId: string,
  input: UpdateWorkflowVariableInput
): Promise<WorkflowVariable> {
  const response = await fetch(
    `/api/workflows/${workflowId}/variables/${variableId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to update variable")
    )
  }

  return response.json()
}

export async function deleteWorkflowVariable(
  workflowId: string,
  variableId: string
): Promise<void> {
  const response = await fetch(
    `/api/workflows/${workflowId}/variables/${variableId}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    const body = await readErrorBody(response)
    const inUseError = parseVariableInUseError(body)
    if (inUseError) throw inUseError
    throw new Error(errorMessageFromBody(body, "Failed to delete variable"))
  }
}
