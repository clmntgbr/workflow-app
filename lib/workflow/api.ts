import { Paginate, PaginateQuery } from "@/lib/paginate"
import {
  CreateWorkflowConnectionInput,
  CreateWorkflowStepInput,
  CreateWorkflowInput,
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

export class WorkflowNotFoundError extends Error {
  constructor() {
    super("Workflow not found")
    this.name = "WorkflowNotFoundError"
  }
}

export class WorkflowWrongOrganizationError extends Error {
  organizationId: string
  organizationName: string

  constructor(organizationId: string, organizationName: string) {
    super("Workflow belongs to another organization")
    this.name = "WorkflowWrongOrganizationError"
    this.organizationId = organizationId
    this.organizationName = organizationName
  }
}

export const getWorkflow = async (id: string): Promise<Workflow> => {
  const response = await fetch(`/api/workflows/${id}`, {
    method: "GET",
  })

  if (response.status === 404) {
    throw new WorkflowNotFoundError()
  }

  if (response.status === 409) {
    const data = (await response.json().catch(() => null)) as {
      code?: string
      organizationId?: string
      organizationName?: string
    } | null

    if (
      data?.code === "WRONG_ORGANIZATION" &&
      typeof data.organizationId === "string" &&
      typeof data.organizationName === "string"
    ) {
      throw new WorkflowWrongOrganizationError(
        data.organizationId,
        data.organizationName
      )
    }

    throw new Error("Failed to get workflow")
  }

  if (!response.ok) {
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

export const activateWorkflow = async (id: string): Promise<Workflow> => {
  const response = await fetch(`/api/workflows/${id}/activate`, {
    method: "POST",
  })

  if (!response.ok) {
    throw new Error("Failed to activate workflow")
  }

  return response.json()
}

export const deactivateWorkflow = async (id: string): Promise<Workflow> => {
  const response = await fetch(`/api/workflows/${id}/deactivate`, {
    method: "POST",
  })

  if (!response.ok) {
    throw new Error("Failed to deactivate workflow")
  }

  return response.json()
}

export const createWorkflowStep = async (
  workflowId: string,
  input: CreateWorkflowStepInput
): Promise<unknown> => {
  const response = await fetch(`/api/workflows/${workflowId}/steps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpointId: input.endpointId,
      position: input.position,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to create workflow step")
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
    throw new Error("Failed to update workflow step")
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
    throw new Error("Failed to create workflow connection")
  }

  return response.json()
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
