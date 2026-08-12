import { Paginate, PaginateQuery } from "@/lib/paginate"
import {
  CreateEndpointInput,
  Endpoint,
  UpdateEndpointInput,
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

export const listEndpoints = async (
  query?: PaginateQuery
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
