import type { Plan } from "@/lib/plan/types"

export interface Subscription {
  id: string
  status: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  startDate: string
  endDate: string
  cancelAtPeriodEnd: boolean
  quotaPeriodStart: string
  plan: Plan | null
  createdAt: string
  updatedAt: string
}

export interface CreateSubscriptionRequest {
  planId: string
  prorationDate?: number
}

export interface CreateSubscriptionResponse {
  url?: string
  updated?: boolean
}

export interface SubscriptionPreviewLine {
  description: string
  amount: number
  proration: boolean
}

export interface SubscriptionPreview {
  requiresCheckout: boolean
  currency?: string
  amountDue?: number
  subtotal?: number
  total?: number
  prorationDate?: number
  periodStart?: string
  periodEnd?: string
  lines?: SubscriptionPreviewLine[]
  currentPlanId?: string
  currentPlanSlug?: string
  targetPlanId?: string
  targetPlanSlug?: string
  targetPlanName?: string
  targetPlanPrice?: number
}

export interface SubscriptionState {
  subscription: Subscription | null
  isLoading: boolean
  isCreating: boolean
  paymentSucceeded: boolean
  error: string | null
}

export type SubscriptionAction =
  | { type: "GET_SUBSCRIPTION"; payload: Subscription | null }
  | { type: "GET_SUBSCRIPTION_LOADING"; payload: boolean }
  | { type: "GET_SUBSCRIPTION_ERROR"; payload: string }
  | { type: "CREATE_SUBSCRIPTION_LOADING"; payload: boolean }
  | { type: "CREATE_SUBSCRIPTION_ERROR"; payload: string | null }
  | { type: "CREATE_SUBSCRIPTION_SUCCESS" }
  | { type: "PAYMENT_SUCCEEDED" }
  | { type: "RESET_PAYMENT_SUCCEEDED" }
