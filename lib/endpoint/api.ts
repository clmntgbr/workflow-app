import { Paginate, PaginateQuery } from "@/lib/paginate"
import {
  CreateEndpointInput,
  Endpoint,
  ImportEndpointsInput,
  UpdateEndpointInput,
} from "./types"

export type EndpointListQuery = PaginateQuery & {
  method?: string | string[]
}

function buildQueryString(query?: EndpointListQuery): string {
  if (!query) return ""

  const params = new URLSearchParams()
  if (query.page != null) params.set("page", String(query.page))
  if (query.limit != null) params.set("limit", String(query.limit))
  if (query.sortBy) params.set("sortBy", query.sortBy)
  if (query.orderBy) params.set("orderBy", query.orderBy)
  if (query.search) params.set("search", query.search)

  const methods = Array.isArray(query.method)
    ? query.method
    : query.method
      ? [query.method]
      : []
  for (const method of methods) {
    if (method) params.append("method", method)
  }

  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

export const listEndpoints = async (
  query?: EndpointListQuery
): Promise<Paginate<Endpoint>> => {
  const response = await fetch(`/api/endpoints${buildQueryString(query)}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to list endpoints")
  }

  return response.json()
}

export const createEndpoint = async (
  input: CreateEndpointInput
): Promise<Endpoint> => {
  const response = await fetch("/api/endpoints", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Failed to create endpoint")
  }

  return response.json()
}

export const getEndpoint = async (id: string): Promise<Endpoint> => {
  const response = await fetch(`/api/endpoints/${id}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to get endpoint")
  }

  return response.json()
}

export const updateEndpoint = async (
  id: string,
  input: UpdateEndpointInput
): Promise<Endpoint> => {
  const response = await fetch(`/api/endpoints/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Failed to update endpoint")
  }

  return response.json()
}

export const deleteEndpoint = async (id: string): Promise<void> => {
  const response = await fetch(`/api/endpoints/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete endpoint")
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function parseImportedEndpoints(data: unknown): Endpoint[] {
  if (Array.isArray(data)) return data as Endpoint[]

  const record = asRecord(data)
  if (Array.isArray(record?.members)) return record.members as Endpoint[]
  if (Array.isArray(record?.data)) return record.data as Endpoint[]

  return []
}

async function readImportErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json()
    const record = asRecord(data)
    const nested = asRecord(record?.data)
    const message = nested?.message ?? record?.message
    if (typeof message === "string" && message.trim()) return message
  } catch {
    // Ignore unreadable error bodies.
  }
  return "Failed to import endpoints"
}

export const importEndpoints = async (
  file: File,
  payload: ImportEndpointsInput
): Promise<Endpoint[]> => {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("payload", JSON.stringify(payload))

  const response = await fetch("/api/endpoints/import", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await readImportErrorMessage(response))
  }

  return parseImportedEndpoints(await response.json())
}
