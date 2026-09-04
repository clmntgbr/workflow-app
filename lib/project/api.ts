import { Paginate, PaginateQuery } from "@/lib/paginate"
import { CreateProjectInput, Project, UpdateProjectInput } from "./types"

export const PROJECTS_PAGE_LIMIT = 20

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

async function readProjectErrorMessage(
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

function parseProjectList(payload: unknown): Paginate<Project> {
  if (Array.isArray(payload)) {
    return {
      members: payload as Project[],
      page: 1,
      limit: payload.length,
      totalPages: 1,
      total: payload.length,
    }
  }

  const record = asRecord(payload)
  const nested = asRecord(record?.data)
  const source =
    nested && Array.isArray(nested.members) ? nested : record

  const members = Array.isArray(source?.members)
    ? (source.members as Project[])
    : []

  const pickNumber = (key: string, fallback: number) => {
    const value = source?.[key]
    return typeof value === "number" && Number.isFinite(value) ? value : fallback
  }

  return {
    members,
    page: pickNumber("page", 1),
    limit: pickNumber("limit", PROJECTS_PAGE_LIMIT),
    totalPages: pickNumber("totalPages", 0),
    total: pickNumber("total", members.length),
  }
}

export const listProjects = async (
  query?: PaginateQuery
): Promise<Paginate<Project>> => {
  const response = await fetch(`/api/projects${buildQueryString(query)}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to list projects")
  }

  return parseProjectList(await response.json())
}

export const createProject = async (
  input: CreateProjectInput
): Promise<Project> => {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(
      await readProjectErrorMessage(response, "Failed to create project")
    )
  }

  return response.json()
}

export const getProject = async (id: string): Promise<Project> => {
  const response = await fetch(`/api/projects/${id}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to get project")
  }

  return response.json()
}

export const updateProject = async (
  id: string,
  input: UpdateProjectInput
): Promise<Project> => {
  const response = await fetch(`/api/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Failed to update project")
  }

  return response.json()
}

export const activateProject = async (id: string): Promise<Project> => {
  const response = await fetch(`/api/projects/${id}/activate`, {
    method: "POST",
  })

  if (!response.ok) {
    throw new Error("Failed to activate project")
  }

  return response.json()
}

export const deleteProject = async (id: string): Promise<void> => {
  const response = await fetch(`/api/projects/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete project")
  }
}

export const removeProjectMember = async (
  projectId: string,
  userId: string
): Promise<void> => {
  const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to remove project member")
  }
}
