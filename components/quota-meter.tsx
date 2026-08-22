"use client"

import { formatCount } from "@/lib/plan/pricing"
import { QUOTA_SCOPE_LABEL, type QuotaScope } from "@/lib/quota/scope"
import { cn } from "@/lib/utils"
import { Lock } from "lucide-react"
import type { ComponentType } from "react"

const SEGMENTS = 20

interface QuotaMeterProps {
  icon: ComponentType<{ className?: string }>
  label: string
  used: number
  max: number
  unit: string
  scope?: QuotaScope
  periodLabel?: string
  lockedHint?: string
  className?: string
}

export function QuotaMeter({
  icon: Icon,
  label,
  used,
  max,
  unit,
  scope = "global",
  periodLabel,
  lockedHint = "Upgrade your plan to unlock.",
  className,
}: QuotaMeterProps) {
  const resolvedPeriodLabel = periodLabel ?? QUOTA_SCOPE_LABEL[scope]
  const available = max > 0
  const safeUsed = Math.max(0, used)
  const safeMax = Math.max(0, max)
  const left = Math.max(0, safeMax - safeUsed)
  const pct = available ? Math.min(100, (safeUsed / safeMax) * 100) : 0
  const isWarning = pct >= 80
  const isCritical = pct >= 95
  const filled = available ? Math.round((pct / 100) * SEGMENTS) : 0

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 sm:p-6",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
          </div>
        </div>

        {available ? (
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {formatCount(safeUsed)}
            <span className="text-base font-normal text-muted-foreground">
              /{formatCount(safeMax)}
            </span>
          </p>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <Lock className="size-3" aria-hidden="true" />
            Not included
          </span>
        )}
      </div>

      <div
        className="mt-5 flex gap-1"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={available ? safeMax : 0}
        aria-valuenow={available ? safeUsed : 0}
      >
        {Array.from({ length: SEGMENTS }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-5 flex-1 rounded-sm transition-colors duration-500 sm:h-6",
              !available
                ? "bg-muted"
                : index < filled
                  ? isCritical
                    ? "bg-destructive"
                    : isWarning
                      ? "bg-amber-500"
                      : "bg-primary"
                  : "bg-muted"
            )}
          />
        ))}
      </div>

      <p
        className={cn(
          "mt-3 text-xs",
          !available
            ? "text-muted-foreground"
            : isCritical
              ? "text-destructive"
              : isWarning
                ? "text-amber-600"
                : "text-muted-foreground"
        )}
      >
        {!available
          ? lockedHint
          : isCritical
            ? "Quota almost reached"
            : `${formatCount(left)} ${unit} left · ${Math.round(pct)}% used`}
      </p>
    </div>
  )
}
