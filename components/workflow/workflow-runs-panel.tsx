"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StepCounts } from "@/lib/misc"
import { cn } from "@/lib/utils"
import { listWorkflowRunsByWorkflow } from "@/lib/workflow-run/api"
import { subscribeWorkflowRunsRefetch } from "@/lib/workflow-run/run-realtime"
import { StepRun, WorkflowRun } from "@/lib/workflow-run/types"
import {
  ArrowRightIcon,
  ClockIcon,
  FolderArchiveIcon,
  LayersIcon,
  TerminalIcon,
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

function StepProgressBar({
  steps,
  totalSteps,
}: {
  steps: StepRun[]
  totalSteps: number
}) {
  const { success, failed, running, pending, skipped, cancelled } =
    StepCounts(steps)

  const pct = (count: number) => (count / totalSteps) * 100

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <div className="flex h-1.5 w-40 overflow-hidden rounded-full bg-muted">
        {success > 0 && (
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${pct(success)}%` }}
          />
        )}
        {failed > 0 && (
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${pct(failed)}%` }}
          />
        )}
        {running > 0 && (
          <div
            className="h-full animate-pulse bg-blue-500 transition-all"
            style={{ width: `${pct(running)}%` }}
          />
        )}
        {pending > 0 && (
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${pct(pending)}%` }}
          />
        )}
        {skipped > 0 && (
          <div
            className="h-full bg-muted-foreground/25 transition-all"
            style={{ width: `${pct(skipped)}%` }}
          />
        )}
        {cancelled > 0 && (
          <div
            className="h-full bg-gray-400 transition-all"
            style={{ width: `${pct(cancelled)}%` }}
          />
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md border px-2 py-0.5 text-[10px] text-muted-foreground capitalize",
        status === "success" &&
          "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
        status === "failed" && "border-destructive/40 text-destructive",
        status === "running" &&
          "border-sky-500/40 text-sky-700 dark:text-sky-400",
        status === "pending" &&
          "border-amber-500/40 text-amber-700 dark:text-amber-400",
        status === "skipped" &&
          "border-slate-400/40 text-slate-600 dark:text-slate-400",
        status === "cancelled" &&
          "border-gray-400/40 text-gray-700 dark:text-gray-400"
      )}
    >
      {status}
    </span>
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
      <div className="space-y-3 py-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3 py-6">
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
    <div className="flex flex-col">
      <div className="space-y-3 py-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {runs.map((run) => (
              <li key={run.id}>
                <button
                  className={`group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50`}
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg`}
                  >
                    <TerminalIcon className={`h-4 w-4`} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={run.status} />
                      <span className="text-xs font-medium text-slate-400">
                        #{run.id.slice(0, 8)}
                      </span>
                      <span className="ml-auto text-xs text-slate-400">
                        {formatDate(run.createdAt)}
                      </span>
                    </div>

                    <StepProgressBar
                      steps={run.stepRuns ?? []}
                      totalSteps={run.stepRuns?.length ?? 0}
                    />

                    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <LayersIcon className="h-3.5 w-3.5 text-slate-400" />
                        {run.stepRuns?.length ?? 0} step
                        {(run.stepRuns?.length ?? 0) > 1 ? "s" : ""}
                        {(run.stepRuns?.filter(
                          (stepRun) => stepRun.status === "failed"
                        ).length ?? 0) > 0 && (
                          <span className="font-medium text-rose-600">
                            (
                            {
                              run.stepRuns?.filter(
                                (stepRun) => stepRun.status === "failed"
                              ).length
                            }{" "}
                            failed)
                          </span>
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
                        {formatMs(
                          run.finishedAt
                            ? new Date(run.finishedAt).getTime() -
                                new Date(run.createdAt).getTime()
                            : 0
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        {run.triggeredBy}
                      </span>
                    </div>
                  </div>

                  <ArrowRightIcon className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t px-4 py-2">
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
