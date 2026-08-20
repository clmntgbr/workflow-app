import { initPaginate, Paginate } from "@/lib/paginate"

export type EndpointMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS"

export type EndpointStatus = "active" | "inactive" | "deleted"

export interface Endpoint {
  id: string
  name: string
  description: string | null
  url: string
  method: EndpointMethod | string
  body: unknown
  headers: Record<string, string>
  query: Record<string, string | string[]>
  timeout: number
  retryOnFailure: boolean
  retryCount: number
  retryDelay: number
  status: EndpointStatus | string
  organizationId: string
  createdAt: string
  updatedAt: string
}

export interface CreateEndpointInput {
  name: string
  description?: string
  url: string
  method: string
  body?: unknown
  headers?: Record<string, string>
  query?: Record<string, string | string[]>
  timeout?: number
  retryOnFailure?: boolean
  retryCount?: number
  retryDelay?: number
}

export interface UpdateEndpointInput {
  name: string
  description?: string
  url: string
  method: string
  body?: unknown
  headers?: Record<string, string>
  query?: Record<string, string | string[]>
  timeout: number
  retryOnFailure: boolean
  retryCount: number
  retryDelay: number
  status: string
}

export interface ImportEndpointsInput {
  baseURL: string
  status: "active" | "inactive"
  headers?: Record<string, string>
  query?: Record<string, string | string[]>
  body?: unknown
  timeout?: number
  retryOnFailure?: boolean
  retryCount?: number
  retryDelay?: number
}

export interface EndpointState {
  endpoints: Paginate<Endpoint>
  isLoading: boolean
  error: string | null
  editingEndpointId: string | null
}

export type EndpointAction =
  | { type: "GET_ENDPOINTS"; payload: Paginate<Endpoint> }
  | { type: "GET_ENDPOINTS_ERROR"; payload: string }
  | { type: "GET_ENDPOINTS_LOADING"; payload: boolean }
  | { type: "UPSERT_ENDPOINT"; payload: Endpoint }
  | { type: "REMOVE_ENDPOINT"; payload: string }
  | { type: "SET_EDITING_ENDPOINT_ID"; payload: string | null }

export const initialEndpointState: EndpointState = {
  endpoints: initPaginate<Endpoint>(),
  isLoading: false,
  error: null,
  editingEndpointId: null,
}
