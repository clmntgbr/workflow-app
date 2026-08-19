import { Paginate, PaginateQuery } from "@/lib/paginate"
import { WorkflowRun, WorkflowRunAnalytics } from "./types"

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

export const listWorkflowRuns = async (
  query?: PaginateQuery
): Promise<Paginate<WorkflowRun>> => {
  const response = await fetch(
    `/api/workflow-runs${buildQueryString(query)}`,
    {
      method: "GET",
    }
  )

  if (!response.ok) {
    throw new Error("Failed to list workflow runs")
  }

  return response.json()
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

export const getWorkflowRunAnalytics =
  async (): Promise<WorkflowRunAnalytics> => {
    const response = await fetch("/api/workflow-runs/analytics", {
      method: "GET",
    })

    if (!response.ok) {
      throw new Error("Failed to load analytics")
    }

    return response.json()
  }

export const getWorkflowRun = async (id: string): Promise<WorkflowRun> => {
  const response = await fetch(`/api/workflow-runs/${id}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to get workflow run")
  }

  return response.json()
}
