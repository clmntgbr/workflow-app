"use client"

import { PlanChangeDrawer } from "@/components/plan-change-drawer"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { usePlans } from "@/lib/plan/context"
import {
  PLAN_META,
  PLAN_ORDER,
  formatPlanPrice,
  getBasePlanSlug,
  getPlanForInterval,
  getQuotaFeatures,
} from "@/lib/plan/pricing"
import {
  createBillingPortalSession,
  previewSubscription,
} from "@/lib/subscription/api"
import { useOptionalSubscription } from "@/lib/subscription/context"
import type { SubscriptionPreview } from "@/lib/subscription/types"
import { cn } from "@/lib/utils"
import { BadgeCheck, Check, Loader2, Zap } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface PricingProps {
  currentPlanSlug?: string | null
}

export function Pricing({ currentPlanSlug }: PricingProps) {
  const { plans, isLoading, error } = usePlans()
  const subscriptionContext = useOptionalSubscription()
  const [annual, setAnnual] = useState(false)
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null)
  const [previewPlanId, setPreviewPlanId] = useState<string | null>(null)
  const [preview, setPreview] = useState<SubscriptionPreview | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const interval = annual ? "year" : "month"

  const createSubscription = subscriptionContext?.createSubscription
  const isCreating = subscriptionContext?.isCreating ?? false
  const subscription = subscriptionContext?.subscription ?? null

  const activeSlug =
    currentPlanSlug ??
    (subscription?.plan?.slug
      ? getBasePlanSlug(subscription.plan.slug)
      : null)

  const handleSelectPlan = async (planId: string) => {
    if (!createSubscription) {
      toast.error("Sign in to subscribe to a plan")
      return
    }

    const selectedPlan = plans.find((plan) => plan.id === planId)
    const isFreePlan =
      selectedPlan?.slug === "free" || selectedPlan?.price === 0

    setPendingPlanId(planId)
    try {
      if (isFreePlan) {
        try {
          const { url } = await createBillingPortalSession()
          if (!url) {
            throw new Error("Missing billing portal url")
          }
          window.location.assign(url)
        } catch {
          toast.error("Unable to open the customer portal", {
            description: "Please try again in a moment.",
          })
        }
        return
      }

      const nextPreview = await previewSubscription(planId)

      if (nextPreview.requiresCheckout) {
        const result = await createSubscription(planId)
        if (!result?.url) {
          toast.error("Unable to create subscription")
          return
        }
        window.location.assign(result.url)
        return
      }

      setPreviewPlanId(planId)
      setPreview(nextPreview)
      setDrawerOpen(true)
    } catch {
      toast.error("Unable to preview plan change", {
        description: "Please try again in a moment.",
      })
    } finally {
      setPendingPlanId(null)
    }
  }

  const handleConfirmPlanChange = async () => {
    if (!createSubscription || !previewPlanId || preview?.prorationDate == null) {
      toast.error("Unable to confirm plan change")
      return
    }

    const result = await createSubscription(previewPlanId, {
      prorationDate: preview.prorationDate,
    })

    if (!result) {
      toast.error("Unable to change plan", {
        description: "Please try again in a moment.",
      })
      return
    }

    if (result.url) {
      window.location.assign(result.url)
      return
    }

    toast.success("Plan updated", {
      description: preview.targetPlanName
        ? `You are now on ${preview.targetPlanName}.`
        : "Your subscription has been updated.",
    })
    setDrawerOpen(false)
    setPreview(null)
    setPreviewPlanId(null)
  }

  const handleDrawerOpenChange = (open: boolean) => {
    setDrawerOpen(open)
    if (!open) {
      setPreview(null)
      setPreviewPlanId(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-6 pb-20">
      <div className="space-y-4 text-center">
        <p className="text-sm font-medium text-primary">
          Simple, transparent pricing
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Choose the plan that fits your needs
        </h1>
        <div className="flex items-center justify-center gap-3">
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              !annual ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Monthly
          </span>
          <Switch
            checked={annual}
            onCheckedChange={setAnnual}
            aria-label="Annual billing"
          />
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              annual ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Annual
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            -20%
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Loading plans…</span>
        </div>
      ) : error ? (
        <div className="py-20 text-center text-sm text-destructive">{error}</div>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((slug) => {
            const meta = PLAN_META[slug]
            const plan = getPlanForInterval(plans, slug, interval)
            if (!plan || !meta) return null

            const isCurrent = activeSlug === slug
            const isHighlight = meta.highlight && !isCurrent
            const annualPlan = getPlanForInterval(plans, slug, "year")
            const monthlyEquivalent = annualPlan ? annualPlan.price / 12 : 0

            const quotaFeatures = getQuotaFeatures(plan.quota)
            const features = [...quotaFeatures, ...meta.extraFeatures]

            return (
              <div
                key={slug}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-6",
                  isCurrent
                    ? "border-emerald-500/60 shadow-lg ring-1 shadow-emerald-500/10 ring-emerald-500/25"
                    : isHighlight
                      ? "border-primary shadow-lg ring-1 shadow-primary/10 ring-primary/20"
                      : "border-border"
                )}
              >
                {isCurrent ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-md">
                      <BadgeCheck className="size-3 shrink-0" />
                      Current plan
                    </span>
                  </div>
                ) : isHighlight ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                      <Zap className="size-3 shrink-0" />
                      {meta.tagline}
                    </span>
                  </div>
                ) : null}

                <div className="mt-2">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isCurrent
                      ? "Your current subscription"
                      : meta.tagline !== "Most popular" && meta.tagline}
                  </p>
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {formatPlanPrice(plan.price, plan.currency)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-sm text-muted-foreground">
                      /{annual ? "year" : "month"}
                    </span>
                  )}
                </div>

                {annual && plan.price > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    About {monthlyEquivalent.toFixed(2)} €/month
                  </p>
                )}

                <p className="mt-3 min-h-10 text-sm text-muted-foreground">
                  {plan.description}
                </p>

                <Button
                  className="mt-5 w-full"
                  variant={
                    isCurrent ? "secondary" : isHighlight ? "default" : "outline"
                  }
                  disabled={isCreating || isCurrent}
                  onClick={() => void handleSelectPlan(plan.id)}
                >
                  {pendingPlanId === plan.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : isCurrent ? (
                    "Current plan"
                  ) : (
                    meta.cta
                  )}
                </Button>

                <ul className="mt-6 flex flex-col gap-3">
                  {features.map((feature, idx) => {
                    const isQuota = idx < quotaFeatures.length
                    return (
                      <li key={feature} className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                            isCurrent
                              ? "bg-emerald-500/15"
                              : isHighlight
                                ? "bg-primary/15"
                                : "bg-primary/10"
                          )}
                        >
                          <Check
                            className={cn(
                              "size-3",
                              isCurrent ? "text-emerald-600" : "text-primary"
                            )}
                          />
                        </span>
                        <span
                          className={cn(
                            "text-sm",
                            isQuota ? "font-medium text-foreground" : "text-foreground"
                          )}
                        >
                          {feature}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </section>
      )}

      <PlanChangeDrawer
        open={drawerOpen}
        preview={preview}
        isConfirming={isCreating}
        onOpenChange={handleDrawerOpenChange}
        onConfirm={() => void handleConfirmPlanChange()}
      />
    </div>
  )
}
