import { initPaginate, Paginate } from "@/lib/paginate"

export type WorkflowStatus = "active" | "inactive" | "deleted" | "canceled"

export interface Workflow {
  id: string
  name: string
  description: string
  status: WorkflowStatus | string
  organizationId: string
  scheduleIntervalMinutes: number
  concurrency: number
  notificationsEnabled: boolean
  notifyOnSuccess: boolean
  notifyOnFailure: boolean
  notifyOnCancel: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateWorkflowInput {
  name: string
  description?: string
  scheduleIntervalMinutes?: number
  concurrency?: number
  notificationsEnabled?: boolean
  notifyOnSuccess?: boolean
  notifyOnFailure?: boolean
  notifyOnCancel?: boolean
}

export interface UpdateWorkflowInput {
  name: string
  description?: string
  status: string
  scheduleIntervalMinutes: number
  concurrency: number
  notificationsEnabled: boolean
  notifyOnSuccess: boolean
  notifyOnFailure: boolean
  notifyOnCancel: boolean
}

export interface CreateWorkflowStepInput {
  endpointId: string
  position: unknown
}

export interface UpdateWorkflowStepInput {
  name: string
  description?: string
  url: string
  method: string
  headers?: Record<string, string>
  query?: Record<string, string>
  body?: Record<string, unknown>
  timeout: number
  retryOnFailure: boolean
  retryCount: number
  retryDelay: number
}

export interface WorkflowConnection {
  id: string
  sourceStepId: string
  targetStepId: string
}

export interface CreateWorkflowConnectionInput {
  sourceStepId: string
  targetStepId: string
}

export interface WorkflowState {
  workflows: Paginate<Workflow>
  isLoading: boolean
  error: string | null
}

export type WorkflowAction =
  | { type: "GET_WORKFLOWS"; payload: Paginate<Workflow> }
  | { type: "GET_WORKFLOWS_ERROR"; payload: string }
  | { type: "GET_WORKFLOWS_LOADING"; payload: boolean }
  | { type: "UPSERT_WORKFLOW"; payload: Workflow }
  | { type: "REMOVE_WORKFLOW"; payload: string }

export const initialWorkflowState: WorkflowState = {
  workflows: initPaginate<Workflow>(),
  isLoading: false,
  error: null,
}
