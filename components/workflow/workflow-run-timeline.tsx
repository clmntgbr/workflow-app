"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  RunStatus,
  WorkflowRun,
  WorkflowRunDetail,
  WorkflowRunStepRunDetail,
} from "@/lib/workflow-run/types"
import {
  CheckIcon,
  CircleAlertIcon,
  ClockIcon,
  Loader2Icon,
  MinusIcon,
  XIcon,
} from "lucide-react"

interface WorkflowRunTimelineProps {
  run: WorkflowRun | WorkflowRunDetail
  stepRuns: WorkflowRunStepRunDetail[]
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

const STATUS_ICON: Record<RunStatus, { bg: string; icon: typeof CheckIcon }> = {
  success: { bg: "bg-emerald-500", icon: CheckIcon },
  failed: { bg: "bg-rose-500", icon: XIcon },
  running: { bg: "bg-sky-500", icon: Loader2Icon },
  waiting: { bg: "bg-violet-500", icon: ClockIcon },
  pending: { bg: "bg-amber-500", icon: ClockIcon },
  cancelled: { bg: "bg-gray-500", icon: MinusIcon },
  skipped: { bg: "bg-slate-400", icon: CircleAlertIcon },
}

function TimelineStatusIcon({ status }: { status: RunStatus }) {
  const { bg, icon: Icon } = STATUS_ICON[status] ?? STATUS_ICON.pending
  return (
    <span
      className={cn(
        "flex size-3 shrink-0 items-center justify-center rounded-full text-white",
        bg
      )}
      aria-label={status}
    >
      <Icon className={cn("size-2", status === "running" && "animate-spin")} />
    </span>
  )
}

function earliestIso(values: Array<string | null | undefined>): string | null {
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

export function WorkflowRunTimeline({
  run,
  stepRuns,
}: WorkflowRunTimelineProps) {
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
      .reduce(
        (sum, item) => sum + (item.startedAt ? stepElapsedMs(item) : 0),
        0
      )
    return { stepRun, skipped, elapsed, offset }
  })

  return (
    <Card className="shadow-none">
      <CardContent className="">
        <TooltipProvider delayDuration={100}>
          <div className="space-y-1.5">
            {packedSteps.map(({ stepRun, skipped, elapsed, offset }) => {
              const statusIcon = (
                <TimelineStatusIcon
                  status={skipped ? "skipped" : stepRun.status}
                />
              )

              if (skipped) {
                return (
                  <div key={stepRun.id} className="flex items-center gap-3">
                    <span className="w-40 truncate text-xs font-bold text-muted-foreground">
                      {stepRun.name}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative h-5 flex-1 rounded bg-gray-500/20">
                          <div className="absolute inset-y-0 left-0 flex w-full items-center px-2" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">This step was skipped</p>
                      </TooltipContent>
                    </Tooltip>
                    {statusIcon}
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
                  <span className="w-40 truncate text-xs font-bold text-gray-900">
                    {stepRun.name}
                  </span>
                  <div className="relative h-5 flex-1 rounded border border-gray-200 bg-secondary/50">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute inset-y-0 rounded-xs",
                            BAR_COLOR[stepRun.status]
                          )}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{formatDuration(elapsed)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {statusIcon}
                </div>
              )
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
