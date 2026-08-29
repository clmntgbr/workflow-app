import { initPaginate, Paginate } from "@/lib/paginate"
import {
  AssertionOperator,
  AssertionSource,
} from "@/lib/workflow/assertion/types"

/** Shared status for workflow runs and step runs. */
export const RUN_STATUSES = [
  "pending",
  "running",
  "waiting",
  "success",
  "failed",
  "cancelled",
  "skipped",
] as const

export type RunStatus = (typeof RUN_STATUSES)[number]

export type WorkflowRunStatus = RunStatus

export type StepRunStatus = RunStatus

export function isRunStatus(value: unknown): value is RunStatus {
  return (
    typeof value === "string" &&
    (RUN_STATUSES as readonly string[]).includes(value)
  )
}

export function parseRunStatus(value: unknown): RunStatus | null | undefined {
  if (value === null) return null
  if (typeof value !== "string") return undefined
  if (isRunStatus(value)) return value
  // Backward-compatible aliases if older payloads appear.
  if (value === "succeeded") return "success"
  if (value === "canceled") return "cancelled"
  return undefined
}

export type WorkflowRunTriggeredBy = "user" | "schedule" | "api" | string

export interface StepRunPosition {
  x: number
  y: number
}

export interface StepRunResponseSnapshot {
  status: number
  headers?: Record<string, string>
  body?: unknown
}

/** Assertion snapshot embedded in step run results. */
export interface StepRunAssertionSnapshot {
  id: string
  description: string | null
  source: AssertionSource
  path: string | null
  operator: AssertionOperator
  expectedValue: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface StepRunAssertionResult {
  assertion: StepRunAssertionSnapshot
  passed: boolean
  actualValue: unknown
  message: string | null
}

/** Insight row returned on GET /api/workflows/:workflowId/runs/:id stepRuns. */
export interface WorkflowRunInsight {
  id: string
  startTime: string | null
  endTime: string | null
  queueTime: number | null
  dnsLookupDuration: number | null
  tcpConnectionTime: number | null
  tlsHandshakeTime: number | null
  ttfb: number | null
  duration: number | null
  statusCode: number | null
  responseSize: number | null
  requestSize: number | null
  attemptNumber: number
  totalAttempts: number
  errorMessage: string | null
  errorType: string | null
}

/** Timing fields from the API are milliseconds. */
export interface Insight {
  id: string
  stepRunId: string
  startTime: string | null
  endTime: string | null
  queueTime: number | null
  dnsLookupDuration: number | null
  tcpConnectionTime: number | null
  tlsHandshakeTime: number | null
  ttfb: number | null
  duration: number | null
  statusCode: number | null
  responseSize: number | null
  requestSize: number | null
  attemptNumber: number
  totalAttempts: number
  errorMessage: string | null
  errorType: string | null
  createdAt: string
  updatedAt: string
}

export interface StepRun {
  id: string
  workflowRunId: string
  stepId: string
  workflowId: string
  endpointId: string
  projectId: string
  name: string
  description: string | null
  url: string
  method: string
  headers: Record<string, string>
  query: Record<string, string | string[]>
  body: Record<string, unknown>
  timeout: number
  retryOnFailure: boolean
  retryCount: number
  retryDelay: number
  index: string
  executionOrder: number
  treeIndex: number
  position: StepRunPosition
  status: StepRunStatus
  attempt: number
  resumeAt: string | null
  responseSnapshot: StepRunResponseSnapshot | null
  insights?: Insight[]
  startedAt: string | null
  finishedAt: string | null
  error: string | null
  createdAt: string
  updatedAt: string
}

/** Nested workflow snapshot returned by GET /api/workflows/:workflowId/runs/:id */
export interface WorkflowRunWorkflow {
  id: string
  name: string
  description: string | null
  status: string
  scheduleType: string
  scheduleIntervalValue: number
  scheduleIntervalUnit: string | null
  scheduleAt: string | null
  scheduleTimezone: string
  nextRunAt: string | null
  notificationsEnabled: boolean
  notifyOnSuccess: boolean
  notifyOnFailure: boolean
  notifyOnCancel: boolean
}

/** Nested step definition returned on stepRuns by GET /api/workflows/:workflowId/runs/:id */
export interface WorkflowRunStep {
  id: string
  endpointId: string
  name: string
  url: string
  method: string
  position: StepRunPosition
  lastRunStatus: RunStatus | null
  description: string | null
  headers: Record<string, string>
  query: Record<string, string | string[]>
  body: Record<string, unknown>
  timeout: number
  retryOnFailure: boolean
  retryCount: number
  retryDelay: number
  index: string
  executionOrder: number
  treeIndex: number
  status: string
}

export interface WorkflowRunStepRunDetail {
  id: string
  name: string
  url: string
  method: string
  executionOrder: number
  status: StepRunStatus
  attempt: number
  resumeAt: string | null
  matchedBranch: boolean | null
  responseSnapshot: StepRunResponseSnapshot | null
  assertionsResult?: StepRunAssertionResult[]
  insights?: WorkflowRunInsight[]
  step: WorkflowRunStep
  startedAt: string | null
  finishedAt: string | null
  error: string | null
}

export interface WorkflowRun {
  id: string
  workflowId: string
  projectId: string
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

/** Detail payload from GET /api/workflows/:workflowId/runs/:id */
export interface WorkflowRunDetail {
  id: string
  status: WorkflowRunStatus
  triggeredBy: WorkflowRunTriggeredBy
  startedAt: string | null
  finishedAt: string | null
  error: string | null
  createdAt: string
  workflow: WorkflowRunWorkflow
  stepRuns: WorkflowRunStepRunDetail[]
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

export interface WorkflowRunAnalytics {
  totalRuns: number
  successRate: number
  successCount: number
  failureRate: number
  failureCount: number
  cancelledCount: number
  runningCount: number
  pendingCount: number
  averageDurationMs: number
  minDurationMs: number
  maxDurationMs: number
  lastRunAt: string | null
}

export const initialWorkflowRunState: WorkflowRunState = {
  workflowRuns: initPaginate<WorkflowRun>(),
  isLoading: false,
  error: null,
}
