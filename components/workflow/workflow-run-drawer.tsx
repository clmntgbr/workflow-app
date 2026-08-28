"use client"

import { StatusBadge } from "@/components/status-badge"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { GetRunDuration } from "@/lib/misc"
import { getWorkflowRun } from "@/lib/workflow-run/api"
import {
  WorkflowRun,
  WorkflowRunDetail,
  WorkflowRunStepRunDetail,
} from "@/lib/workflow-run/types"
import { formatCountdown } from "@/lib/workflow/delay"
import { useEffect, useState } from "react"

interface WorkflowRunDrawerProps {
  workflowId: string
  run: WorkflowRun | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

function StepRunCountdown({ resumeAt }: { resumeAt: string | null }) {
  const [label, setLabel] = useState<string | null>(
    resumeAt ? formatCountdown(resumeAt) : null
  )

  useEffect(() => {
    if (!resumeAt) {
      setLabel(null)
      return
    }

    const tick = () => {
      setLabel(formatCountdown(resumeAt))
    }

    tick()
    const intervalId = window.setInterval(tick, 1000)
    return () => window.clearInterval(intervalId)
  }, [resumeAt])

  if (!label) return null

  return (
    <p className="text-xs text-violet-600">{label}</p>
  )
}

function StepRunRow({ stepRun }: { stepRun: WorkflowRunStepRunDetail }) {
  const duration = GetRunDuration(stepRun.startedAt, stepRun.finishedAt)

  return (
    <li className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">
            {stepRun.name}
          </p>
          {stepRun.url ? (
            <p className="truncate text-xs text-slate-500">{stepRun.url}</p>
          ) : null}
        </div>
        <StatusBadge status={stepRun.status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {duration ? <span>{duration}</span> : null}
        {stepRun.status === "waiting" ? (
          <StepRunCountdown resumeAt={stepRun.resumeAt} />
        ) : null}
        {stepRun.error ? (
          <span className="text-rose-600">{stepRun.error}</span>
        ) : null}
      </div>
    </li>
  )
}

export function WorkflowRunDrawer({
  workflowId,
  run,
  isOpen,
  onOpenChange,
}: WorkflowRunDrawerProps) {
  const [detailedRun, setDetailedRun] = useState<WorkflowRunDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeRunId = isOpen && run ? run.id : null

  useEffect(() => {
    if (!activeRunId) {
      setDetailedRun(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      setDetailedRun(null)

      try {
        const full = await getWorkflowRun(workflowId, activeRunId)
        if (cancelled) return
        setDetailedRun(full)
      } catch {
        if (cancelled) return
        setError("Failed to load workflow run")
        setDetailedRun(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [activeRunId, workflowId])

  const sortedStepRuns = detailedRun
    ? [...detailedRun.stepRuns].sort(
        (left, right) => left.executionOrder - right.executionOrder
      )
    : []

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="flex h-full w-[80vw]! max-w-[80vw]! flex-col">
        <DrawerHeader className="sr-only">
          <DrawerTitle>
            {detailedRun
              ? `Workflow run ${detailedRun.id}`
              : run
                ? `Workflow run ${run.id}`
                : "Workflow run"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground">{error}</p>
          ) : detailedRun ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium">
                  Run #{detailedRun.id.split("-")[0]}
                </p>
                <StatusBadge status={detailedRun.status} />
              </div>

              <ul className="space-y-3">
                {sortedStepRuns.map((stepRun) => (
                  <StepRunRow key={stepRun.id} stepRun={stepRun} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
