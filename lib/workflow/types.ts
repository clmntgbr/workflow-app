import { initPaginate, Paginate } from "@/lib/paginate"

export type WorkflowStatus = "active" | "inactive" | "deleted" | "canceled"

export type ScheduleType = "none" | "recurring" | "once"

export type ScheduleUnit =
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "year"

export interface Workflow {
  id: string
  name: string
  description: string
  status: WorkflowStatus | string
  projectId: string
  scheduleType: ScheduleType | string
  scheduleIntervalValue: number
  scheduleIntervalUnit: ScheduleUnit | string
  scheduleAt: string | null
  scheduleTimezone: string
  nextRunAt: string | null
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
  scheduleType?: ScheduleType
  scheduleIntervalValue?: number
  scheduleIntervalUnit?: ScheduleUnit | ""
  scheduleAt?: string | null
  scheduleTimezone?: string
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
  scheduleType: ScheduleType
  scheduleIntervalValue: number
  scheduleIntervalUnit: ScheduleUnit | ""
  scheduleAt: string | null
  scheduleTimezone: string
  concurrency: number
  notificationsEnabled: boolean
  notifyOnSuccess: boolean
  notifyOnFailure: boolean
  notifyOnCancel: boolean
}

export type StepType = "http" | "delay" | "condition"

export type ConditionBranch = "true" | "false"

export type CreateWorkflowStepInput =
  | {
      type?: "http"
      endpointId: string
      position: { x: number; y: number }
      delayDurationSeconds?: null
      expression?: null
    }
  | {
      type: "delay"
      endpointId?: null
      delayDurationSeconds: number
      position: { x: number; y: number }
      name?: string
      description?: string
      expression?: null
    }
  | {
      type: "condition"
      endpointId?: null
      expression: string
      position: { x: number; y: number }
      name?: string
      description?: string
      delayDurationSeconds?: null
    }

export interface UpdateWorkflowStepInput {
  name: string
  description?: string
  url: string
  method: string
  headers?: Record<string, string>
  query?: Record<string, string | string[]>
  body?: Record<string, unknown>
  timeout: number
  retryOnFailure: boolean
  retryCount: number
  retryDelay: number
}

export interface UpdateDelayWorkflowStepInput {
  name: string
  description?: string
  delayDurationSeconds: number
}

export interface UpdateConditionWorkflowStepInput {
  name: string
  description?: string
  expression: string
}

export interface WorkflowConnection {
  id: string
  sourceStepId: string
  targetStepId: string
  branch: ConditionBranch | null
}

export interface CreateWorkflowConnectionInput {
  sourceStepId: string
  targetStepId: string
  branch?: ConditionBranch | null
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
