import { Paginate, PaginateQuery } from "@/lib/paginate"
import {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  Workflow,
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
    throw new Error("Failed to create workflow")
  }

  return response.json()
}

export class WorkflowNotFoundError extends Error {
  constructor() {
    super("Workflow not found")
    this.name = "WorkflowNotFoundError"
  }
}

export const getWorkflow = async (id: string): Promise<Workflow> => {
  const response = await fetch(`/api/workflows/${id}`, {
    method: "GET",
  })

  if (response.status === 404) {
    throw new WorkflowNotFoundError()
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
    throw new Error("Failed to update workflow")
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
