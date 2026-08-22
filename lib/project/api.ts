import { CreateProjectInput, Project, UpdateProjectInput } from "./types"

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

export const listProjects = async (): Promise<Project[]> => {
  const response = await fetch("/api/projects", {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to list projects")
  }

  return response.json()
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
