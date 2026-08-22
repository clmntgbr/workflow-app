export type QuotaScope = "monthly" | "global"

export const QUOTA_SCOPE_LABEL: Record<QuotaScope, string> = {
  monthly: "This month",
  global: "Total",
}
