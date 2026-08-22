export interface Quota {
  id: string
  name: string
  maxOrganizationMembers: number
  maxWorkflows: number
  maxStepsPerWorkflow: number
  maxEndpoints: number
  maxVariablesPerWorkflow: number
  maxWorkflowRunsPerMonth: number
  maxConcurrentRuns: number
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
  createdAt: string
  updatedAt: string
}

export interface Plan {
  id: string
  name: string
  description: string | null
  slug: string
  stripePriceId: string
  isActive: boolean
  billingInterval: "month" | "year"
  price: number
  currency: "EUR" | "USD"
  quotaId: string
  quota: Quota
  createdAt: string
  updatedAt: string
}

export interface PlanState {
  plans: Plan[]
  isLoading: boolean
  error: string | null
}

export type PlanAction =
  | { type: "GET_PLANS"; payload: Plan[] }
  | { type: "GET_PLANS_ERROR"; payload: string }
  | { type: "GET_PLANS_LOADING"; payload: boolean }
