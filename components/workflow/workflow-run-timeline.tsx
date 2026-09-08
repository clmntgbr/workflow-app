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
import { Fragment } from "react"

interface WorkflowRunTimelineProps {
  run: WorkflowRun | WorkflowRunDetail
  stepRuns: WorkflowRunStepRunDetail[]
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

const MIN_VISIBLE_RATIO = 0.008

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
  const timedSteps = stepRuns.map((stepRun) => {
    const skipped = !stepRun.startedAt
    const elapsed = skipped ? 0 : stepElapsedMs(stepRun)
    return { stepRun, skipped, elapsed }
  })
  const rawTotal = Math.max(
    run.duration,
    timedSteps.reduce((sum, item) => sum + item.elapsed, 0),
    1
  )
  const minVisibleMs = rawTotal * MIN_VISIBLE_RATIO
  const visualWeights = timedSteps.map((item) => {
    if (item.skipped) return 0
    return Math.max(item.elapsed, minVisibleMs)
  })
  const visualTotal = Math.max(
    visualWeights.reduce((sum, weight) => sum + weight, 0),
    1
  )
  const packedSteps = timedSteps.map((item, index) => ({
    ...item,
    offset: visualWeights
      .slice(0, index)
      .reduce((sum, weight) => sum + weight, 0),
    visualWidth: visualWeights[index] ?? 0,
  }))

  return (
    <Card className="shadow-none">
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <div className="grid grid-cols-[max-content_1fr_auto] items-center gap-x-3 gap-y-1.5">
            {packedSteps.map(
              ({ stepRun, skipped, elapsed, offset, visualWidth }) => {
                const statusIcon = (
                  <TimelineStatusIcon
                    status={skipped ? "skipped" : stepRun.status}
                  />
                )
                const left = (offset / visualTotal) * 100
                const width = (visualWidth / visualTotal) * 100

                return (
                <Fragment key={stepRun.id}>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      skipped ? "text-muted-foreground" : "text-gray-900"
                    )}
                  >
                    {stepRun.name}
                  </span>
                  {skipped ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative h-5 min-w-0 rounded bg-gray-500/20">
                          <div className="absolute inset-y-0 left-0 flex w-full items-center px-2" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">This step was skipped</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className="relative h-5 min-w-0 rounded border border-gray-200 bg-secondary/50">
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
                  )}
                  {statusIcon}
                </Fragment>
              )
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
