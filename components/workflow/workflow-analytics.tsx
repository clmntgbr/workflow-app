"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { getWorkflowRunAnalytics } from "@/lib/workflow-run/api"
import { subscribeWorkflowRunsRefetch } from "@/lib/workflow-run/run-realtime"
import { WorkflowRunAnalytics } from "@/lib/workflow-run/types"
import {
  BarChart3Icon,
  CheckCircle2Icon,
  ClockIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  TimerIcon,
  XCircleIcon,
  ZapIcon,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  detail?: string
  className?: string
}

function StatCard({ icon, label, value, detail }: StatCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-background p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tracking-tight">{value}</p>
        {detail ? (
          <p className="text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </div>
    </div>
  )
}

interface WorkflowAnalyticsProps {
  workflowId: string
}

export function WorkflowAnalytics({ workflowId }: WorkflowAnalyticsProps) {
  const [analytics, setAnalytics] = useState<WorkflowRunAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsLoading(true)
    try {
      const data = await getWorkflowRunAnalytics(workflowId)
      setAnalytics(data)
    } catch {
      if (!options?.silent) setAnalytics(null)
    } finally {
      if (!options?.silent) setIsLoading(false)
    }
  }, [workflowId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return subscribeWorkflowRunsRefetch(workflowId, () => {
      void load({ silent: true })
    })
  }, [workflowId, load])

  if (isLoading && !analytics) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (!analytics) {
    return (
      <p className="text-sm text-muted-foreground">Failed to load analytics.</p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={<BarChart3Icon className="size-5 text-indigo-600" />}
        label="Total runs"
        value={String(analytics.totalRuns)}
      />
      <StatCard
        icon={<CheckCircle2Icon className="size-5 text-emerald-600" />}
        label="Success rate"
        value={`${analytics.successRate.toFixed(1)}%`}
        detail={`${analytics.successCount} completed`}
      />
      <StatCard
        icon={<XCircleIcon className="size-5 text-red-600" />}
        label="Failed"
        value={`${analytics.failureRate.toFixed(1)}%`}
        detail={`${analytics.failureCount} failed`}
      />
      <StatCard
        icon={<ZapIcon className="size-5 text-amber-500" />}
        label="Avg duration"
        value={formatMs(analytics.averageDurationMs)}
      />
      <StatCard
        icon={<TimerIcon className="size-5 text-sky-600" />}
        label="Min duration"
        value={formatMs(analytics.minDurationMs)}
      />
      <StatCard
        icon={<ClockIcon className="size-5 text-orange-500" />}
        label="Max duration"
        value={formatMs(analytics.maxDurationMs)}
      />
      <StatCard
        icon={<PlayCircleIcon className="size-5 text-sky-600" />}
        label="Running"
        value={String(analytics.runningCount)}
      />
      <StatCard
        icon={<PauseCircleIcon className="size-5 text-zinc-500" />}
        label="Cancelled"
        value={String(analytics.cancelledCount)}
      />
    </div>
  )
}
