import { initPaginate, Paginate } from "@/lib/paginate"

export type WorkflowRunStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled"
  | string

export type WorkflowRunTriggeredBy = "user" | "schedule" | "api" | string

export interface StepRunPosition {
  x: number
  y: number
}

export interface StepRunResponseSnapshot {
  status: number
  headers: Record<string, string>
  body: unknown
}

export interface StepRun {
  id: string
  workflowRunId: string
  stepId: string
  workflowId: string
  endpointId: string
  organizationId: string
  name: string
  description: string | null
  url: string
  method: string
  headers: Record<string, string>
  query: Record<string, string>
  body: Record<string, unknown>
  timeout: number
  retryOnFailure: boolean
  retryCount: number
  retryDelay: number
  index: string
  executionOrder: number
  treeIndex: number
  position: StepRunPosition
  status: string
  attempt: number
  responseSnapshot: StepRunResponseSnapshot | null
  startedAt: string | null
  finishedAt: string | null
  error: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkflowRun {
  id: string
  workflowId: string
  organizationId: string
  status: WorkflowRunStatus
  triggeredBy: WorkflowRunTriggeredBy
  triggeredByUserId: string | null
  context: Record<string, unknown>
  startedAt: string | null
  finishedAt: string | null
  error: string | null
  createdAt: string
  updatedAt: string
  stepRuns?: StepRun[]
}

export interface WorkflowRunState {
  workflowRuns: Paginate<WorkflowRun>
  isLoading: boolean
  error: string | null
}

export type WorkflowRunAction =
  | { type: "GET_WORKFLOW_RUNS"; payload: Paginate<WorkflowRun> }
  | { type: "GET_WORKFLOW_RUNS_ERROR"; payload: string }
  | { type: "GET_WORKFLOW_RUNS_LOADING"; payload: boolean }
  | { type: "UPSERT_WORKFLOW_RUN"; payload: WorkflowRun }

export const initialWorkflowRunState: WorkflowRunState = {
  workflowRuns: initPaginate<WorkflowRun>(),
  isLoading: false,
  error: null,
}
