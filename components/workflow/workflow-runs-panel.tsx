"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { listWorkflowRunsByWorkflow } from "@/lib/workflow-run/api"
import { subscribeWorkflowRunsRefetch } from "@/lib/workflow-run/run-realtime"
import { Insight, StepRun, WorkflowRun } from "@/lib/workflow-run/types"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderArchiveIcon,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { EmptyComponent } from "../empty"

interface WorkflowRunsPanelProps {
  workflowId: string
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  return new Date(value).toLocaleString()
}

function formatMs(value: number | null | undefined): string {
  if (value == null) return "—"
  if (value < 1000) return `${value} ms`
  return `${(value / 1000).toFixed(2)} s`
}

function formatBytes(value: number | null | undefined): string {
  if (value == null) return "—"
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md border px-2 py-0.5 text-[10px] text-muted-foreground capitalize",
        status === "succeeded" &&
          "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
        status === "failed" && "border-destructive/40 text-destructive",
        status === "running" &&
          "border-sky-500/40 text-sky-700 dark:text-sky-400",
        status === "pending" &&
          "border-amber-500/40 text-amber-700 dark:text-amber-400"
      )}
    >
      {status}
    </span>
  )
}

function InsightMetrics({ insight }: { insight: Insight }) {
  const metrics: { label: string; value: string }[] = [
    { label: "Duration", value: formatMs(insight.duration) },
    { label: "Queue", value: formatMs(insight.queueTime) },
    { label: "DNS", value: formatMs(insight.dnsLookupDuration) },
    { label: "TCP", value: formatMs(insight.tcpConnectionTime) },
    { label: "TLS", value: formatMs(insight.tlsHandshakeTime) },
    { label: "TTFB", value: formatMs(insight.ttfb) },
    {
      label: "Status",
      value: insight.statusCode != null ? String(insight.statusCode) : "—",
    },
    { label: "Request", value: formatBytes(insight.requestSize) },
    { label: "Response", value: formatBytes(insight.responseSize) },
  ]

  return (
    <div className="space-y-2 rounded-md border bg-background/80 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          Attempt {insight.attemptNumber}/{insight.totalAttempts}
        </span>
        <span>
          {formatDate(insight.startTime)} → {formatDate(insight.endTime)}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
              {metric.label}
            </dt>
            <dd className="truncate text-xs font-medium">{metric.value}</dd>
          </div>
        ))}
      </dl>
      {insight.errorMessage ? (
        <p className="text-xs text-destructive">
          {insight.errorType ? `${insight.errorType}: ` : null}
          {insight.errorMessage}
        </p>
      ) : null}
    </div>
  )
}

function StepRunRow({ stepRun }: { stepRun: StepRun }) {
  const insights = stepRun.insights ?? []

  return (
    <li className="space-y-2 border-t px-4 py-2.5 first:border-t-0">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{stepRun.name}</span>
            <span className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground uppercase">
              {stepRun.method}
            </span>
            <StatusBadge status={stepRun.status} />
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {stepRun.url}
          </p>
          {stepRun.error ? (
            <p className="mt-1 text-xs text-destructive">{stepRun.error}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-xs text-muted-foreground sm:text-right">
          <p>Attempt {stepRun.attempt}</p>
          <p>
            {formatDate(stepRun.startedAt)} → {formatDate(stepRun.finishedAt)}
          </p>
          {stepRun.responseSnapshot ? (
            <p>HTTP {stepRun.responseSnapshot.status}</p>
          ) : null}
        </div>
      </div>

      {insights.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Insights ({insights.length})
          </p>
          {insights
            .slice()
            .sort((a, b) => a.attemptNumber - b.attemptNumber)
            .map((insight) => (
              <InsightMetrics key={insight.id} insight={insight} />
            ))}
        </div>
      ) : null}
    </li>
  )
}

function WorkflowRunCard({ run }: { run: WorkflowRun }) {
  const [open, setOpen] = useState(true)
  const stepRuns = run.stepRuns ?? []

  return (
    <article className="overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
      >
        <div className="flex min-w-0 items-start gap-2">
          {open ? (
            <ChevronDownIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {run.id.slice(0, 8)}
              </span>
              <StatusBadge status={run.status} />
              <span className="rounded-md border px-2 py-0.5 text-[10px] text-muted-foreground capitalize">
                {run.triggeredBy}
              </span>
            </div>
            {run.error ? (
              <p className="text-xs text-destructive">{run.error}</p>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right text-xs text-muted-foreground">
          <p>Started {formatDate(run.startedAt ?? run.createdAt)}</p>
          <p>Finished {formatDate(run.finishedAt)}</p>
        </div>
      </button>

      {open ? (
        <div className="border-t bg-muted/20">
          <div className="flex items-center justify-between px-4 py-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              Step runs ({stepRuns.length})
            </h3>
          </div>
          {stepRuns.length === 0 ? (
            <p className="px-4 pb-3 text-sm text-muted-foreground">
              No step runs for this execution.
            </p>
          ) : (
            <ul>
              {stepRuns
                .slice()
                .sort((a, b) => a.executionOrder - b.executionOrder)
                .map((stepRun) => (
                  <StepRunRow key={stepRun.id} stepRun={stepRun} />
                ))}
            </ul>
          )}
        </div>
      ) : null}
    </article>
  )
}

export function WorkflowRunsPanel({ workflowId }: WorkflowRunsPanelProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  const loadRuns = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false
      if (!silent) {
        setIsLoading(true)
        setError(null)
      }

      try {
        const list = await listWorkflowRunsByWorkflow(workflowId, {
          page,
          limit: 20,
          orderBy: "desc",
        })

        setRuns(list.members)
        setTotalPages(list.totalPages)
        setError(null)
      } catch {
        if (!silent) {
          setRuns([])
          setTotalPages(0)
          setError("Failed to load workflow runs")
        }
      } finally {
        if (!silent) setIsLoading(false)
      }
    },
    [workflowId, page]
  )

  useEffect(() => {
    void loadRuns()
  }, [loadRuns])

  useEffect(() => {
    return subscribeWorkflowRunsRefetch(workflowId, () => {
      void loadRuns({ silent: true })
    })
  }, [workflowId, loadRuns])

  if (isLoading && runs.length === 0) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <EmptyComponent
        title="No workflow runs yet"
        description="No workflow runs yet. Get started by running your first workflow."
        icon={<FolderArchiveIcon size={20} className="text-gray-600" />}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {runs.map((run) => (
          <WorkflowRunCard key={run.id} run={run} />
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="flex shrink-0 items-center justify-between border-t px-4 py-2">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
