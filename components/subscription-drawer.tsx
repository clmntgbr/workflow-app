"use client"

import { InvoicesCard } from "@/components/invoices-card"
import { QuotaMeter } from "@/components/quota-meter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  formatCount,
  formatKb,
  formatPlanPrice,
  getBasePlanSlug,
} from "@/lib/plan/pricing"
import { useQuota } from "@/lib/quota/context"
import { createBillingPortalSession } from "@/lib/subscription/api"
import { useSubscription } from "@/lib/subscription/context"
import type { Subscription } from "@/lib/subscription/types"
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  GitBranch,
  Globe,
  History,
  Infinity as InfinityIcon,
  Loader2,
  Play,
  Sparkles,
  Users,
} from "lucide-react"
import { useEffect, useState, type ComponentType } from "react"
import { toast } from "sonner"

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Past due",
  canceled: "Canceled",
  cancelled: "Canceled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
}

interface SubscriptionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGoPricing: () => void
}

export function SubscriptionDrawer({
  open,
  onOpenChange,
  onGoPricing,
}: SubscriptionDrawerProps) {
  const { subscription, isLoading } = useSubscription()
  const [portalLoading, setPortalLoading] = useState(false)

  const handleOpenPortal = async () => {
    setPortalLoading(true)
    try {
      const { url } = await createBillingPortalSession()
      if (!url) {
        throw new Error("Missing billing portal url")
      }
      setPortalLoading(false)
      window.location.assign(url)
    } catch {
      toast.error("Unable to open the customer portal", {
        description: "Please try again in a moment.",
      })
      setPortalLoading(false)
    }
  }

  useEffect(() => {
    const resetPortalLoading = () => setPortalLoading(false)
    window.addEventListener("pageshow", resetPortalLoading)
    window.addEventListener("focus", resetPortalLoading)
    return () => {
      window.removeEventListener("pageshow", resetPortalLoading)
      window.removeEventListener("focus", resetPortalLoading)
    }
  }, [])

  const handleGoPricing = () => {
    onOpenChange(false)
    onGoPricing()
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="flex h-full w-full! max-w-full! flex-col gap-0 overflow-hidden p-2 sm:w-[min(100vw,60rem)]! sm:max-w-[60rem]!">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-popover">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Your subscription</DrawerTitle>
            <DrawerDescription>
              Plan, quotas, and billing in one place.
            </DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            {isLoading && !subscription ? (
              <LoadingState />
            ) : !subscription || !subscription.plan ? (
              <EmptyState onGoPricing={handleGoPricing} />
            ) : (
              <SubscriptionContent
                subscription={subscription}
                portalLoading={portalLoading}
                onOpenPortal={handleOpenPortal}
                onGoPricing={handleGoPricing}
              />
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function LoadingState() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-40 w-full animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="h-56 animate-pulse rounded-2xl bg-muted" />
      <p className="sr-only">Loading your subscription…</p>
    </div>
  )
}

function EmptyState({ onGoPricing }: { onGoPricing: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="relative flex flex-col items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CreditCard className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            No active subscription
          </h2>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Choose a plan to unlock higher quotas and production workflows.
          </p>
        </div>
        <Button onClick={onGoPricing} className="mt-1">
          <Sparkles className="size-4" aria-hidden="true" />
          View plans
        </Button>
      </div>
    </div>
  )
}

function SubscriptionContent({
  subscription,
  portalLoading,
  onOpenPortal,
  onGoPricing,
}: {
  subscription: Subscription
  portalLoading: boolean
  onOpenPortal: () => void
  onGoPricing: () => void
}) {
  const { quota: usage } = useQuota()
  const plan = subscription.plan!
  const planQuota = plan.quota
  const limits = usage?.limits

  const periodStart = usage?.workflowRuns.periodStart ?? subscription.startDate
  const periodEnd = usage?.workflowRuns.periodEnd ?? subscription.endDate
  const remainingDays = daysUntil(periodEnd)
  const cycleProgress = computeCycleProgress(periodStart, periodEnd)

  const hasPortal = Boolean(subscription.stripeCustomerId)
  const isFree = plan.price === 0 || getBasePlanSlug(plan.slug) === "free"

  return (
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-2xl border border-border bg-linear-to-br from-sky-500/8 via-background to-background">
        <div className="grid lg:grid-cols-2">
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {STATUS_LABELS[subscription.status] ?? subscription.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Since {formatDate(subscription.startDate)}
              </span>
              {subscription.cancelAtPeriodEnd ? (
                <Badge variant="secondary">Cancels at period end</Badge>
              ) : null}
            </div>

            <div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {plan.name}
                </h2>
                <span className="text-base font-semibold text-primary">
                  {formatPlanPrice(plan.price, plan.currency)}
                  {plan.price > 0 && (
                    <span className="font-normal text-muted-foreground">
                      /{plan.billingInterval === "year" ? "year" : "month"}
                    </span>
                  )}
                </span>
              </div>
              {plan.description ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border/70 p-5 sm:p-6 lg:border-t-0 lg:border-l">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarClock
                className="size-4 text-primary"
                aria-hidden="true"
              />
              Billing period
            </div>

            <p className="text-xl font-bold tracking-tight sm:text-2xl">
              {formatDate(periodStart)}
              <br />
              {formatDate(periodEnd)}
            </p>

            <div className="mt-auto">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${cycleProgress}%` }}
                />
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                {isFree ? (
                  <>
                    <InfinityIcon
                      className="size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    Plan with no expiration date
                  </>
                ) : (
                  <>{remainingDays} days left</>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Account limits
          </h3>
          <p className="text-xs text-muted-foreground">
            Total across your project, not reset monthly
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <QuotaMeter
            icon={Play}
            label="Workflow runs"
            used={usage?.workflowRuns.used ?? 0}
            max={usage?.workflowRuns.max ?? planQuota.maxWorkflowRunsPerMonth}
            unit="runs"
            scope="monthly"
          />
          <QuotaMeter
            icon={Building2}
            label="Projects"
            used={usage?.projects.used ?? 0}
            max={usage?.projects.max ?? planQuota.maxProjects}
            unit="projects"
            scope="global"
          />
          <QuotaMeter
            icon={GitBranch}
            label="Workflows"
            used={usage?.workflows.used ?? 0}
            max={usage?.workflows.max ?? planQuota.maxWorkflows}
            unit="workflows"
            scope="global"
          />
          <QuotaMeter
            icon={Globe}
            label="Endpoints"
            used={usage?.endpoints.used ?? 0}
            max={usage?.endpoints.max ?? planQuota.maxEndpoints}
            unit="endpoints"
            scope="global"
          />
          <QuotaMeter
            icon={Users}
            label="Project members"
            used={usage?.members.used ?? 0}
            max={usage?.members.max ?? planQuota.maxProjectMembers}
            unit="members"
            scope="global"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-lg font-bold">Plan limits</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Global caps that apply regardless of billing period
        </p>
        <div className="mt-4 divide-y divide-border/70">
          <DetailRow
            icon={GitBranch}
            label="Steps per workflow"
            value={formatCount(
              limits?.maxStepsPerWorkflow ?? planQuota.maxStepsPerWorkflow
            )}
          />
          <DetailRow
            icon={GitBranch}
            label="Variables per workflow"
            value={formatCount(
              limits?.maxVariablesPerWorkflow ??
                planQuota.maxVariablesPerWorkflow
            )}
          />
          <DetailRow
            icon={CheckCircle2}
            label="Assertions per workflow"
            value={formatCount(
              limits?.maxAssertionsPerWorkflow ??
                planQuota.maxAssertionsPerWorkflow
            )}
          />
          <DetailRow
            icon={CalendarClock}
            label="Min schedule interval"
            value={`${
              limits?.minScheduleIntervalMinutes ??
              planQuota.minScheduleIntervalMinutes
            } min`}
          />
          <DetailRow
            icon={History}
            label="Run history retention"
            value={`${
              limits?.runHistoryRetentionDays ??
              planQuota.runHistoryRetentionDays
            } days`}
          />
          <DetailRow
            icon={Globe}
            label="Max request body"
            value={formatKb(
              limits?.maxRequestBodySizeKb ?? planQuota.maxRequestBodySizeKb
            )}
          />
          <DetailRow
            icon={Globe}
            label="Max response body"
            value={formatKb(
              limits?.maxResponseBodySizeKb ?? planQuota.maxResponseBodySizeKb
            )}
          />
          <DetailRow
            icon={Play}
            label="Concurrent runs"
            value={formatCount(
              usage?.concurrentRuns.max ?? planQuota.maxConcurrentRuns
            )}
          />
          <DetailRow
            icon={Play}
            label="Max step timeout"
            value={`${
              limits?.maxStepTimeoutSeconds ?? planQuota.maxStepTimeoutSeconds
            }s`}
          />
          <DetailRow
            icon={Play}
            label="Max retries per step"
            value={formatCount(
              limits?.maxRetryCountPerStep ?? planQuota.maxRetryCountPerStep
            )}
          />
          <DetailRow
            icon={Sparkles}
            label="Executor priority"
            value={formatCount(
              limits?.executorPriority ?? planQuota.executorPriority
            )}
          />
          <DetailRow
            icon={Sparkles}
            label="OpenAPI import"
            value={
              (limits?.allowsOpenApiImport ?? planQuota.allowsOpenApiImport)
                ? "Yes"
                : "No"
            }
          />
          <DetailRow
            icon={Sparkles}
            label="Insights"
            value={
              (limits?.allowsInsights ?? planQuota.allowsInsights)
                ? "Yes"
                : "No"
            }
          />
          <DetailRow
            icon={Sparkles}
            label="Data export"
            value={
              (limits?.allowsDataExport ?? planQuota.allowsDataExport)
                ? "Yes"
                : "No"
            }
          />
        </div>
      </section>

      <section
        className={
          getBasePlanSlug(plan.slug) !== "business"
            ? "grid gap-4 sm:grid-cols-2"
            : "grid gap-4"
        }
      >
        <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <CreditCard className="size-5" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-bold">Stripe customer portal</h3>
          <p className="mt-2 flex-1 text-sm text-muted-foreground">
            Manage your payment method, download invoices, or change or cancel
            your subscription.
          </p>
          <div className="mt-4 border-t border-border/70 pt-4">
            {isFree ? (
              <Button className="w-full" disabled>
                <CreditCard className="size-4" aria-hidden="true" />
                Free plan — no billing
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={hasPortal ? onOpenPortal : onGoPricing}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CreditCard className="size-4" aria-hidden="true" />
                )}
                {hasPortal ? "Open billing portal" : "Choose a paid plan"}
              </Button>
            )}
          </div>
        </div>

        {getBasePlanSlug(plan.slug) !== "business" && (
          <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-bold">Level up your plan</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">
              Unlock more workflows, runs, endpoints, and advanced features.
            </p>
            <div className="mt-4 border-t border-border/70 pt-4">
              <Button className="w-full" onClick={onGoPricing}>
                <ArrowUpRight className="size-4" aria-hidden="true" />
                View plans
              </Button>
            </div>
          </div>
        )}
      </section>

      <InvoicesCard isFree={isFree} onGoPricing={onGoPricing} />
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function daysUntil(value: string): number {
  const target = new Date(value).getTime()
  if (Number.isNaN(target)) return 0
  const diff = target - Date.now()
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)))
}

function computeCycleProgress(start: string, end: string): number {
  const now = Date.now()
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  const total = endMs - startMs
  if (!Number.isFinite(total) || total <= 0) return 0
  const elapsed = now - startMs
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}
