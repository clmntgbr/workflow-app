"use client"

import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GetRunDuration } from "@/lib/misc"
import { cn } from "@/lib/utils"
import {
  WorkflowRunInsight,
  WorkflowRunStepRunDetail,
} from "@/lib/workflow-run/types"
import { inferStepType } from "@/lib/workflow/step-validation"
import { StepType } from "@/lib/workflow/types"
import {
  ChevronRightIcon,
  ClockIcon,
  GaugeIcon,
  GitBranchIcon,
  GlobeIcon,
  ServerIcon,
  TimerIcon,
} from "lucide-react"
import { Fragment, useState } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip"

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-700 border-emerald-200",
  POST: "bg-blue-50 text-blue-700 border-blue-200",
  PUT: "bg-amber-50 text-amber-700 border-amber-200",
  PATCH: "bg-orange-50 text-orange-700 border-orange-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
  HEAD: "bg-slate-50 text-slate-700 border-slate-200",
  OPTIONS: "bg-violet-50 text-violet-700 border-violet-200",
}

const STEP_TYPE_ICON: Record<
  StepType,
  { icon: typeof GlobeIcon; className: string }
> = {
  http: {
    icon: GlobeIcon,
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  delay: {
    icon: TimerIcon,
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  condition: {
    icon: GitBranchIcon,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
}

export interface WorkflowRunStepRunProps {
  stepRun: WorkflowRunStepRunDetail
  index: number
}

function MethodBadge({ method }: { method: string | null | undefined }) {
  if (!method) return null
  const normalized = method.toUpperCase()
  return (
    <span
      className={cn(
        "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        METHOD_STYLES[normalized] ??
          "border-border bg-muted text-muted-foreground"
      )}
    >
      {normalized}
    </span>
  )
}

function StepTypeIcon({ type }: { type: StepType }) {
  const { icon: Icon, className } = STEP_TYPE_ICON[type]
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md border",
        className
      )}
    >
      <Icon className="size-3.5" />
    </span>
  )
}

function statusCodeClass(status: number): string {
  if (status >= 200 && status < 300) return "text-emerald-600"
  if (status >= 400) return "text-rose-600"
  return "text-muted-foreground"
}

function formatMillisLabel(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—"
  return `${ms}ms`
}

function stepElapsedMs(stepRun: WorkflowRunStepRunDetail): number {
  if (!stepRun.startedAt || !stepRun.finishedAt) return 0
  const start = new Date(stepRun.startedAt).getTime()
  const end = new Date(stepRun.finishedAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  return Math.max(0, end - start)
}

function resolveStepType(stepRun: WorkflowRunStepRunDetail): StepType {
  return inferStepType(stepRun.step as unknown as Record<string, unknown>)
}

function readDelaySeconds(
  step: WorkflowRunStepRunDetail["step"]
): number | null {
  const record = step as unknown as Record<string, unknown>
  const raw = record.delayDurationSeconds ?? record.delay_duration_seconds
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : null
}

export function WorkflowRunStepRun({
  stepRun,
  index,
}: WorkflowRunStepRunProps) {
  const [expanded, setExpanded] = useState(false)
  const stepType = resolveStepType(stepRun)
  const insights = stepRun.insights ?? []
  const skipped = !stepRun.startedAt || stepRun.status === "skipped"
  const status = skipped ? "skipped" : stepRun.status
  const delaySeconds = readDelaySeconds(stepRun.step)
  const elapsed = skipped ? 0 : stepElapsedMs(stepRun)
  const durationLabel =
    stepType === "delay"
      ? delaySeconds != null
        ? GetRunDuration(delaySeconds * 1000) || "—"
        : "—"
      : GetRunDuration(elapsed) || "—"
  const responseStatus = stepRun.responseSnapshot?.status
  const hasDetails = !skipped && stepType === "http" && insights.length > 0

  const header = (
    <>
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted font-mono text-xs font-semibold text-muted-foreground">
        {index + 1}
      </div>
      <StepTypeIcon type={stepType} />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 truncate text-sm font-semibold">
          {stepRun.name}
        </span>
        {stepType === "http" && (stepRun.method || stepRun.url) ? (
          <>
            <MethodBadge method={stepRun.method} />
            {stepRun.url ? (
              <p className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                {stepRun.url}
              </p>
            ) : null}
            <StatusBadge status={status} />
          </>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge
          variant="outline"
          className="gap-1 font-mono text-muted-foreground tabular-nums"
        >
          <ClockIcon data-icon="inline-start" />
          {durationLabel}
        </Badge>
        {hasDetails ? (
          <ChevronRightIcon
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-90"
            )}
          />
        ) : null}
      </div>
    </>
  )

  const headerClassName =
    "flex h-auto w-full items-center justify-start gap-3 px-4 py-3 text-left whitespace-normal"

  return (
    <div
      className={cn(
        "border-b last:border-b-0",
        expanded && "bg-muted/30",
        skipped && "opacity-60"
      )}
    >
      {hasDetails ? (
        <Button
          type="button"
          variant="ghost"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className={cn(headerClassName, "rounded-none hover:bg-muted/60")}
        >
          {header}
        </Button>
      ) : (
        <div className={headerClassName}>{header}</div>
      )}

      {expanded && hasDetails ? (
        <div className="space-y-4 border-t px-4 py-4">
          <InsightsPanel insights={insights} />
        </div>
      ) : null}
    </div>
  )
}

function InsightsPanel({ insights }: { insights: WorkflowRunInsight[] }) {
  const insight = insights[0]
  if (!insight) return null

  const phases = [
    {
      label: "Queue",
      value: insight.queueTime,
      icon: ClockIcon,
      tooltip: "Time spent in the queue",
    },
    {
      label: "DNS",
      value: insight.dnsLookupDuration,
      icon: GlobeIcon,
      tooltip: "Time spent looking up the DNS",
    },
    {
      label: "TCP",
      value: insight.tcpConnectionTime,
      icon: ServerIcon,
      tooltip: "Time spent connecting to the server",
    },
    {
      label: "TLS",
      value: insight.tlsHandshakeTime,
      icon: ServerIcon,
      tooltip: "Time spent handshaking the TLS",
    },
    {
      label: "TTFB",
      value: insight.ttfb,
      icon: GaugeIcon,
      tooltip: "Time to first byte",
    },
    {
      label: "Request time",
      value: insight.duration,
      icon: TimerIcon,
      tooltip: "Time spent making the request",
    },
  ]
  const maxValue = Math.max(...phases.map((phase) => phase.value ?? 0), 1)

  return (
    <div className="space-y-3">
      <TooltipProvider delayDuration={100}>
        <div className="grid grid-cols-[max-content_1fr_auto] items-center gap-x-3 gap-y-2 rounded-lg border bg-muted/30 p-3">
          {phases.map((phase) => (
            <Fragment key={phase.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex w-fit cursor-default items-center gap-1.5 justify-self-start">
                    <phase.icon className="size-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {phase.label}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{phase.tooltip}</p>
                </TooltipContent>
              </Tooltip>
              <div className="relative h-5 min-w-0 overflow-hidden rounded bg-muted">
                <div
                  className={cn(
                    "h-full rounded",
                    phase.label === "Request time"
                      ? "bg-emerald-500/60"
                      : "bg-emerald-500/30"
                  )}
                  style={{
                    width: `${Math.max(((phase.value ?? 0) / maxValue) * 100, phase.value ? 2 : 0)}%`,
                  }}
                />
              </div>
              <span className="text-right font-mono text-xs tabular-nums">
                {formatMillisLabel(phase.value)}
              </span>
            </Fragment>
          ))}
        </div>
      </TooltipProvider>
    </div>
  )
}
