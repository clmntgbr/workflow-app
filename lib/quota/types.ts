export interface QuotaUsage {
  periodStart: string
  periodEnd: string
  workflowRunsUsed: number
  workflowRunsMax: number
  workflowRunsLeft: number
  workflowsUsed: number
  workflowsMax: number
  workflowsLeft: number
  endpointsUsed: number
  endpointsMax: number
  endpointsLeft: number
  membersUsed: number
  membersMax: number
  membersLeft: number
  concurrentRunsUsed: number
  concurrentRunsMax: number
  concurrentRunsLeft: number
  maxStepsPerWorkflow: number
  maxVariablesPerWorkflow: number
  minScheduleIntervalMinutes: number
  runHistoryRetentionDays: number
  maxStepTimeoutSeconds: number
  maxRetryCountPerStep: number
  maxRequestBodySizeKb: number
  maxResponseBodySizeKb: number
  allowsOpenApiImport: boolean
  allowsInsights: boolean
  allowsDataExport: boolean
  executorPriority: number
}

export interface QuotaState {
  quota: QuotaUsage | null
  isLoading: boolean
  error: string | null
}

export type QuotaAction =
  | { type: "GET_QUOTA"; payload: QuotaUsage }
  | { type: "GET_QUOTA_LOADING"; payload: boolean }
  | { type: "GET_QUOTA_ERROR"; payload: string }
