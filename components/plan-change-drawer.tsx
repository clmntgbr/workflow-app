"use client"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { usePlans } from "@/lib/plan/context"
import {
  PLAN_ORDER,
  formatMoneyCents,
  formatPlanPrice,
  getBasePlanSlug,
  getPlanForInterval,
  type PlanSlug,
} from "@/lib/plan/pricing"
import type { SubscriptionPreview } from "@/lib/subscription/types"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  ArrowRight,
  CalendarRange,
  Check,
  Clock,
  CreditCard,
  Crown,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react"
import type { ComponentType } from "react"

const PLAN_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  free: Sparkles,
  starter: Zap,
  pro: Crown,
  business: ShieldCheck,
}

const PLAN_COLORS: Record<string, string> = {
  free: "text-muted-foreground bg-secondary",
  starter: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
  pro: "text-primary bg-primary/10",
  business: "text-violet-600 bg-violet-500/10 dark:text-violet-400",
}

interface PlanChangeDrawerProps {
  open: boolean
  preview: SubscriptionPreview | null
  isConfirming?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function PlanChangeDrawer({
  open,
  preview,
  isConfirming = false,
  onOpenChange,
  onConfirm,
}: PlanChangeDrawerProps) {
  const { plans } = usePlans()

  if (!preview) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} direction="right">
        <DrawerContent className="flex h-full w-full! max-w-full! flex-col gap-0 overflow-hidden p-2 sm:w-[min(100vw,28rem)]! sm:max-w-[28rem]!">
          <DrawerTitle className="sr-only">Plan change preview</DrawerTitle>
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl bg-popover">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  const currency = preview.currency ?? "eur"
  const lines = preview.lines ?? []
  const currentBaseSlug = getBasePlanSlug(preview.currentPlanSlug ?? "")
  const targetBaseSlug = getBasePlanSlug(preview.targetPlanSlug ?? "")
  const currentPlan = getPlanForInterval(plans, currentBaseSlug, "month")

  const currentIndex = PLAN_ORDER.indexOf(currentBaseSlug as PlanSlug)
  const targetIndex = PLAN_ORDER.indexOf(targetBaseSlug as PlanSlug)
  const isUpgrade =
    currentIndex >= 0 && targetIndex >= 0 ? targetIndex > currentIndex : true
  const isDowngrade = !isUpgrade && currentIndex >= 0 && targetIndex >= 0

  const CurrentIcon = PLAN_ICONS[currentBaseSlug] ?? Sparkles
  const TargetIcon = PLAN_ICONS[targetBaseSlug] ?? ShieldCheck
  const amountDue = preview.amountDue ?? 0
  const isCredit = amountDue < 0

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="flex h-full w-full! max-w-full! flex-col gap-0 overflow-hidden p-2 sm:w-[min(100vw,28rem)]! sm:max-w-[28rem]!">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-popover">
          <DrawerTitle className="sr-only">Plan change preview</DrawerTitle>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            <section className="relative overflow-hidden rounded-2xl border border-border">
              <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-card to-card" />
              <div
                className={cn(
                  "pointer-events-none absolute -top-16 -right-16 size-48 rounded-full opacity-20 blur-3xl",
                  isUpgrade ? "bg-primary" : "bg-amber-500"
                )}
              />
              <div className="relative flex items-center justify-between gap-3 p-5">
                <div className="flex flex-1 flex-col items-center gap-2 text-center">
                  <div
                    className={cn(
                      "flex size-12 items-center justify-center rounded-2xl",
                      PLAN_COLORS[currentBaseSlug] ?? "bg-secondary"
                    )}
                  >
                    <CurrentIcon className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">
                      {currentPlan?.name ?? currentBaseSlug}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentPlan
                        ? formatPlanPrice(
                            currentPlan.price,
                            currentPlan.currency
                          )
                        : "—"}
                      {currentPlan && currentPlan.price > 0 && (
                        <span className="text-[0.65rem]">/month</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-center gap-1">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full border",
                      isUpgrade
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </div>
                  <span
                    className={cn(
                      "text-[0.6rem] font-bold tracking-wide uppercase",
                      isUpgrade
                        ? "text-primary"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {isUpgrade ? "Upgrade" : "Downgrade"}
                  </span>
                </div>

                <div className="flex flex-1 flex-col items-center gap-2 text-center">
                  <div
                    className={cn(
                      "flex size-12 items-center justify-center rounded-2xl ring-2",
                      PLAN_COLORS[targetBaseSlug] ?? "bg-secondary",
                      isUpgrade ? "ring-primary/30" : "ring-amber-500/30"
                    )}
                  >
                    <TargetIcon className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">
                      {preview.targetPlanName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {preview.targetPlanPrice != null
                        ? formatPlanPrice(preview.targetPlanPrice, currency)
                        : "—"}
                      {preview.targetPlanPrice != null &&
                        preview.targetPlanPrice > 0 && (
                          <span className="text-[0.65rem]">/month</span>
                        )}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-4">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative flex items-center justify-between p-5">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {isCredit ? "Credit on your account" : "Due today"}
                    </p>
                    <p className="mt-1 text-3xl font-bold tabular-nums">
                      {formatMoneyCents(Math.abs(amountDue), currency)}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex size-14 items-center justify-center rounded-2xl",
                      isCredit
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {isCredit ? (
                      <Check className="size-6" aria-hidden="true" />
                    ) : (
                      <CreditCard className="size-6" aria-hidden="true" />
                    )}
                  </div>
                </div>
                {(preview.periodStart || preview.periodEnd) && (
                  <div className="border-t border-border/40 px-5 py-2.5">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarRange className="size-3" aria-hidden="true" />
                      Period:{" "}
                      {preview.periodStart
                        ? formatDate(preview.periodStart)
                        : "—"}{" "}
                      →{" "}
                      {preview.periodEnd ? formatDate(preview.periodEnd) : "—"}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {lines.length > 0 && (
              <section className="mt-4">
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="divide-y divide-border/40">
                    {lines.map((line, index) => {
                      const lineCredit = line.amount < 0
                      return (
                        <div
                          key={`${line.description}-${index}`}
                          className="flex items-start justify-between gap-3 px-5 py-3.5"
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className={cn(
                                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                                lineCredit
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-primary/10 text-primary"
                              )}
                            >
                              {lineCredit ? (
                                <Minus className="size-3" aria-hidden="true" />
                              ) : (
                                <Plus className="size-3" aria-hidden="true" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm leading-snug">
                                {line.description}
                              </p>
                              {line.proration && (
                                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary/60 px-1.5 py-0.5 text-[0.6rem] font-medium text-muted-foreground">
                                  <Clock
                                    className="size-2"
                                    aria-hidden="true"
                                  />
                                  Proration
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 text-sm font-semibold tabular-nums",
                              lineCredit
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-foreground"
                            )}
                          >
                            {lineCredit ? "−" : "+"}
                            {formatMoneyCents(Math.abs(line.amount), currency)}
                          </span>
                        </div>
                      )
                    })}

                    <div className="flex items-center justify-between px-5 py-4">
                      <span className="text-sm font-bold">Total</span>
                      <span className="text-lg font-extrabold tabular-nums">
                        {formatMoneyCents(preview.total ?? amountDue, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {!preview.requiresCheckout && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                <p className="text-xs text-muted-foreground">
                  No immediate checkout required. The amount will be applied on
                  your next Stripe invoice.
                </p>
              </div>
            )}

            {isDowngrade && (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
                <AlertCircle
                  className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                  aria-hidden="true"
                />
                <p className="text-xs text-muted-foreground">
                  Downgrading may disable some features at the end of the
                  current billing cycle.
                </p>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border/60 p-4">
            <div className="flex flex-col gap-2.5">
              <Button
                onClick={onConfirm}
                disabled={isConfirming}
                className="w-full"
                size="lg"
              >
                {isConfirming ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Confirming…
                  </>
                ) : (
                  <>
                    <Check className="size-4" aria-hidden="true" />
                    Confirm switch to {preview.targetPlanName}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full text-muted-foreground"
                onClick={() => onOpenChange(false)}
                disabled={isConfirming}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
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
