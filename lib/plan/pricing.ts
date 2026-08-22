import type { Plan, Quota } from "./types"

export const PLAN_ORDER = ["free", "starter", "pro", "business"] as const

export type PlanSlug = (typeof PLAN_ORDER)[number]

export interface PlanMeta {
  tagline: string
  cta: string
  highlight: boolean
  extraFeatures: string[]
}

export const PLAN_META: Record<PlanSlug, PlanMeta> = {
  free: {
    tagline: "To explore",
    cta: "Start for free",
    highlight: false,
    extraFeatures: ["Community support"],
  },
  starter: {
    tagline: "To get started",
    cta: "Choose Starter",
    highlight: false,
    extraFeatures: ["Email support"],
  },
  pro: {
    tagline: "Most popular",
    cta: "Choose Pro",
    highlight: true,
    extraFeatures: ["Priority support"],
  },
  business: {
    tagline: "For teams",
    cta: "Choose Business",
    highlight: false,
    extraFeatures: ["Dedicated support", "Insights & export"],
  },
}

export function getBasePlanSlug(slug: string): PlanSlug | string {
  if (slug === "free") return "free"
  if (slug.startsWith("starter")) return "starter"
  if (slug.startsWith("pro")) return "pro"
  if (slug.startsWith("business")) return "business"
  return slug
}

export function formatPlanPrice(amount: number, currency: string): string {
  if (amount === 0) return "Free"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatMoneyCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function normalizeBillingInterval(interval: string): "month" | "year" {
  if (interval === "year" || interval === "annually" || interval === "annual") {
    return "year"
  }
  return "month"
}

export function getPlanForInterval(
  plans: Plan[],
  baseSlug: string,
  interval: string
): Plan | undefined {
  const billingInterval = normalizeBillingInterval(interval)

  const exact = plans.find(
    (plan) =>
      getBasePlanSlug(plan.slug) === baseSlug &&
      normalizeBillingInterval(plan.billingInterval) === billingInterval &&
      plan.isActive
  )
  if (exact) return exact

  if (billingInterval === "year") {
    return plans.find(
      (plan) =>
        getBasePlanSlug(plan.slug) === baseSlug &&
        normalizeBillingInterval(plan.billingInterval) === "month" &&
        plan.isActive
    )
  }

  return undefined
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-US")
}

export function formatKb(kb: number): string {
  if (kb <= 0) return "—"
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(kb % 1024 === 0 ? 0 : 1)} MB`
}

export function getQuotaFeatures(quota: Quota): string[] {
  return [
    `${formatCount(quota.maxWorkflowRunsPerMonth)} runs / month`,
    `${formatCount(quota.maxWorkflows)} workflows`,
    `${formatCount(quota.maxEndpoints)} endpoints`,
    `${formatCount(quota.maxStepsPerWorkflow)} steps by workflows`,
    `${formatCount(quota.maxVariablesPerWorkflow)} variables by workflows`,
    `${formatCount(quota.maxConcurrentRuns)} concurrent runs`,
    `${quota.runHistoryRetentionDays} days run history`,
    `Request body up to ${formatKb(quota.maxRequestBodySizeKb)}`,
    `Response body up to ${formatKb(quota.maxResponseBodySizeKb)}`,
    quota.allowsOpenApiImport ? "OpenAPI import" : "Manual endpoints only",
    quota.allowsInsights ? "Workflow insights" : "Basic analytics",
    quota.allowsDataExport ? "Data export" : "No data export",
  ]
}
