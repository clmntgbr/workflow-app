import { Paginate, PaginateQuery } from "@/lib/paginate"
import {
  normalizeWorkflowActivityEntry,
  WorkflowActivityEntry,
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

function normalizePaginatedPayload(
  payload: unknown
): Paginate<WorkflowActivityEntry> {
  const record = asRecord(payload)
  const nested = asRecord(record?.data)
  const source = nested ?? record

  const rawMembers = Array.isArray(source?.members)
    ? source.members
    : Array.isArray(record?.members)
      ? record.members
      : []

  const members = rawMembers
    .map((item) => normalizeWorkflowActivityEntry(item))
    .filter((item): item is WorkflowActivityEntry => item !== null)

  const pickNumber = (keys: string[], fallback = 0) => {
    for (const key of keys) {
      const value = source?.[key] ?? record?.[key]
      if (typeof value === "number" && Number.isFinite(value)) return value
    }
    return fallback
  }

  return {
    members,
    page: pickNumber(["page"], 1),
    limit: pickNumber(["limit"], 20),
    totalPages: pickNumber(["totalPages", "total_pages"], 0),
    total: pickNumber(["total"], members.length),
  }
}

export const listWorkflowActivity = async (
  workflowId: string,
  query?: PaginateQuery
): Promise<Paginate<WorkflowActivityEntry>> => {
  const response = await fetch(
    `/api/workflows/${workflowId}/activity${buildQueryString({
      sortBy: "occurred_at",
      orderBy: "desc",
      ...query,
    })}`,
    { method: "GET" }
  )

  if (!response.ok) {
    throw new Error("Failed to load workflow activity")
  }

  const payload: unknown = await response.json()
  return normalizePaginatedPayload(payload)
}
