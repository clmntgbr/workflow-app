"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { GetRunDuration } from "@/lib/misc"
import { cn } from "@/lib/utils"
import { getWorkflowRun } from "@/lib/workflow-run/api"
import {
  RunStatus,
  WorkflowRun,
  WorkflowRunDetail,
  WorkflowRunStepRunDetail,
} from "@/lib/workflow-run/types"
import { useEffect, useState } from "react"

interface WorkflowRunDrawerProps {
  workflowId: string
  run: WorkflowRun | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatDuration(ms: number): string {
  const safe = Math.max(0, ms)
  if (safe < 1000) return `${Math.round(safe)}ms`
  if (safe < 60_000) return `${(safe / 1000).toFixed(1)}s`
  return `${Math.floor(safe / 60_000)}m ${Math.floor((safe % 60_000) / 1000)}s`
}

function parseTime(iso: string | null | undefined): number | null {
  if (!iso) return null
  const time = new Date(iso).getTime()
  return Number.isNaN(time) ? null : time
}

const BAR_COLOR: Record<RunStatus, string> = {
  success: "bg-emerald-500",
  failed: "bg-rose-500",
  running: "bg-sky-500",
  waiting: "bg-violet-500",
  pending: "bg-amber-500",
  cancelled: "bg-gray-500",
  skipped: "bg-slate-400/40",
}

function earliestIso(
  values: Array<string | null | undefined>
): string | null {
  let earliest: string | null = null
  let earliestTime = Number.POSITIVE_INFINITY
  for (const value of values) {
    const time = parseTime(value)
    if (time == null || time >= earliestTime) continue
    earliestTime = time
    earliest = value ?? null
  }
  return earliest
}

function latestIso(values: Array<string | null | undefined>): string | null {
  let latest: string | null = null
  let latestTime = Number.NEGATIVE_INFINITY
  for (const value of values) {
    const time = parseTime(value)
    if (time == null || time <= latestTime) continue
    latestTime = time
    latest = value ?? null
  }
  return latest
}

function stepElapsedMs(stepRun: WorkflowRunStepRunDetail): number {
  const start = parseTime(stepRun.startedAt)
  const end = parseTime(stepRun.finishedAt)
  if (start == null || end == null) return 0
  return Math.max(0, end - start)
}

function RunTimeline({
  run,
  stepRuns,
}: {
  run: WorkflowRun | WorkflowRunDetail
  stepRuns: WorkflowRunStepRunDetail[]
}) {
  const firstStepAt = earliestIso(stepRuns.map((stepRun) => stepRun.startedAt))
  const lastStepAt = latestIso(
    stepRuns.map((stepRun) => stepRun.finishedAt ?? stepRun.startedAt)
  )
  const packedTotal = Math.max(
    run.duration,
    stepRuns.reduce((sum, stepRun) => sum + stepElapsedMs(stepRun), 0),
    1
  )
  const packedSteps = stepRuns.map((stepRun, index, items) => {
    const skipped = !stepRun.startedAt
    const elapsed = skipped ? 0 : stepElapsedMs(stepRun)
    const offset = items
      .slice(0, index)
      .reduce((sum, item) => sum + (item.startedAt ? stepElapsedMs(item) : 0), 0)
    return { stepRun, skipped, elapsed, offset }
  })

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Timeline</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {firstStepAt && lastStepAt
              ? `${formatTime(firstStepAt)} → ${formatTime(lastStepAt)} · `
              : null}
            {GetRunDuration(run.duration)}
          </span>
        </div>
        <TooltipProvider delayDuration={100}>
          <div className="space-y-1.5">
            {packedSteps.map(({ stepRun, skipped, elapsed, offset }) => {
              if (skipped) {
                return (
                  <div key={stepRun.id} className="flex items-center gap-3">
                    <span className="w-40 truncate text-xs text-muted-foreground">
                      {stepRun.name}
                    </span>
                    <div className="relative h-5 flex-1 rounded bg-secondary/50">
                      <div className="absolute inset-y-0 left-0 flex w-full items-center px-2">
                        <span className="font-mono text-[10px] text-muted-foreground/60">
                          skipped
                        </span>
                      </div>
                    </div>
                  </div>
                )
              }

              const left = (offset / packedTotal) * 100
              const width = Math.max(
                (elapsed / packedTotal) * 100,
                elapsed > 0 ? 0.8 : 0
              )

              return (
                <div key={stepRun.id} className="flex items-center gap-3">
                  <span className="w-40 truncate text-xs text-muted-foreground">
                    {stepRun.name}
                  </span>
                  <div className="relative h-5 flex-1 rounded bg-secondary/50">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute inset-y-0 rounded-sm",
                            BAR_COLOR[stepRun.status]
                          )}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono text-xs">
                          {stepRun.name} — {formatDuration(elapsed)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}

export function WorkflowRunDrawer({
  workflowId,
  run,
  isOpen,
  onOpenChange,
}: WorkflowRunDrawerProps) {
  const [detailedRun, setDetailedRun] = useState<WorkflowRunDetail | null>(null)

  const activeRunId = isOpen && run ? run.id : null

  useEffect(() => {
    if (!activeRunId) return

    let cancelled = false

    const load = async () => {
      try {
        const full = await getWorkflowRun(workflowId, activeRunId)
        if (cancelled) return
        setDetailedRun(full)
      } catch {
        if (cancelled) return
        setDetailedRun(null)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [activeRunId, workflowId])

  const resolvedRun =
    detailedRun && run && detailedRun.id === run.id ? detailedRun : null
  const sortedStepRuns = resolvedRun
    ? [...resolvedRun.stepRuns].sort(
        (left, right) => left.executionOrder - right.executionOrder
      )
    : []
  const timelineRun = resolvedRun ?? run

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
          {timelineRun ? (
            <RunTimeline run={timelineRun} stepRuns={sortedStepRuns} />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
