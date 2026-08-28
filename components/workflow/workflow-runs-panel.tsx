"use client"

import { ListPagination } from "@/components/list-pagination"
import { Skeleton } from "@/components/ui/skeleton"
import {
  FormatRunDateTime,
  GetRunDuration,
  GetStepSummary,
  StepCounts,
} from "@/lib/misc"
import { listWorkflowRunsByWorkflow } from "@/lib/workflow-run/api"
import { subscribeWorkflowRunsRefetch } from "@/lib/workflow-run/run-realtime"
import { StepRun, WorkflowRun } from "@/lib/workflow-run/types"
import { FolderArchiveIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { EmptyComponent } from "../empty"
import { StatusBadge } from "../status-badge"
import { WorkflowRunDrawer } from "./workflow-run-drawer"

interface WorkflowRunsPanelProps {
  workflowId: string
}

function StepProgressBar({
  steps,
  totalSteps,
}: {
  steps: StepRun[]
  totalSteps: number
}) {
  const { success, failed, running, waiting, pending, skipped, cancelled } =
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
        {waiting > 0 && (
          <div
            className="h-full bg-violet-500 transition-all"
            style={{ width: `${pct(waiting)}%` }}
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

export function WorkflowRunsPanel({ workflowId }: WorkflowRunsPanelProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null)
  const [isRunDrawerOpen, setIsRunDrawerOpen] = useState(false)

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
          limit: 5,
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
    <div className="flex flex-col pb-7">
      <div className="space-y-3 py-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-none">
          <ul className="divide-y divide-slate-100">
            {runs.map((run) => {
              const duration = GetRunDuration(run.startedAt, run.finishedAt)
              const summary = GetStepSummary(run.stepRuns ?? [])
              const steps = run.stepRuns
              const total = steps?.length ?? 0

              return (
                <div
                  key={run.id}
                  className="cursor-pointer overflow-hidden bg-white shadow-sm transition-all select-none hover:shadow-md"
                >
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                    onClick={() => {
                      setSelectedRun(run)
                      setIsRunDrawerOpen(true)
                    }}
                  >
                    <div className="flex w-24 shrink-0 items-center justify-center">
                      <StatusBadge status={run.status} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold text-slate-900">
                          #{run.id.split("-")[0]}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                        <span>
                          {FormatRunDateTime(run.startedAt ?? run.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {summary.success && <span>{summary.success}</span>}
                      {summary.failed && <span>{summary.failed}</span>}
                      {summary.running && <span>{summary.running}</span>}
                      {summary.waiting && <span>{summary.waiting}</span>}
                      {summary.pending && <span>{summary.pending}</span>}
                      {summary.skipped && <span>{summary.skipped}</span>}
                      {summary.cancelled && <span>{summary.cancelled}</span>}
                    </div>

                    <div className="flex shrink-0 items-center gap-5">
                      {total > 0 && (
                        <StepProgressBar
                          steps={steps ?? []}
                          totalSteps={total}
                        />
                      )}

                      <div className="flex w-16 flex-col items-end">
                        <span className="text-sm font-bold text-slate-900">
                          {duration}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </ul>
        </div>
      </div>

      {totalPages > 1 ? (
        <ListPagination
          page={page}
          totalPages={totalPages}
          isLoading={isLoading}
          ariaLabel="Workflow runs pagination"
          onPageChange={setPage}
        />
      ) : null}

      <WorkflowRunDrawer
        workflowId={workflowId}
        run={selectedRun}
        isOpen={isRunDrawerOpen}
        onOpenChange={(open) => {
          setIsRunDrawerOpen(open)
          if (!open) setSelectedRun(null)
        }}
      />
    </div>
  )
}
