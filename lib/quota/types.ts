export interface MonthlyQuotaCounter {
  periodStart: string
  periodEnd: string
  used: number
  max: number
  left: number
}

export interface QuotaCounter {
  used: number
  max: number
  left: number
}

export interface QuotaLimits {
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

export interface QuotaUsage {
  workflowRuns: MonthlyQuotaCounter
  projects: QuotaCounter
  workflows: QuotaCounter
  endpoints: QuotaCounter
  members: QuotaCounter
  concurrentRuns: QuotaCounter
  limits: QuotaLimits
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
