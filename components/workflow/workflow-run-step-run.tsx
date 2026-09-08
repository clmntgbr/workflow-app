"use client"

import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GetRunDuration } from "@/lib/misc"
import { cn } from "@/lib/utils"
import {
  RunStatus,
  WorkflowRunInsight,
  WorkflowRunStepRunDetail,
} from "@/lib/workflow-run/types"
import { formatDelayDuration } from "@/lib/workflow/delay"
import { inferStepType } from "@/lib/workflow/step-validation"
import { StepType } from "@/lib/workflow/types"
import {
  CheckIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  ClockIcon,
  GaugeIcon,
  GitBranchIcon,
  GlobeIcon,
  Loader2Icon,
  ServerIcon,
  TimerIcon,
  XIcon,
} from "lucide-react"
import { Fragment, useState } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip"

const METHOD_STYLES: Record<string, string> = {
  GET: "border-emerald-200 bg-emerald-50 text-emerald-700",
  POST: "border-blue-200 bg-blue-50 text-blue-700",
  PUT: "border-amber-200 bg-amber-50 text-amber-700",
  PATCH: "border-orange-200 bg-orange-50 text-orange-700",
  DELETE: "border-red-200 bg-red-50 text-red-700",
  HEAD: "border-slate-200 bg-slate-50 text-slate-700",
  OPTIONS: "border-violet-200 bg-violet-50 text-violet-700",
}

const STATUS_ICON: Record<RunStatus, typeof CheckIcon> = {
  success: CheckIcon,
  failed: XIcon,
  skipped: CircleAlertIcon,
  cancelled: CircleAlertIcon,
  waiting: ClockIcon,
  running: Loader2Icon,
  pending: ClockIcon,
}

const STATUS_COLOR: Record<RunStatus, string> = {
  success: "text-emerald-600",
  failed: "text-rose-600",
  skipped: "text-slate-500",
  cancelled: "text-orange-600",
  waiting: "text-violet-600",
  running: "text-sky-600",
  pending: "text-amber-600",
}

const STEP_TYPE_LABEL: Record<StepType, string> = {
  http: "HTTP",
  delay: "Delay",
  condition: "Condition",
}

export interface WorkflowRunStepRunProps {
  stepRun: WorkflowRunStepRunDetail
  index: number
}

function MethodBadge({ method }: { method: string | null | undefined }) {
  if (!method) return null
  const normalized = method.toUpperCase()
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono uppercase",
        METHOD_STYLES[normalized] ?? "text-muted-foreground"
      )}
    >
      {normalized}
    </Badge>
  )
}

function StepTypeBadge({ type }: { type: StepType }) {
  return (
    <Badge variant="secondary" className="font-medium">
      {STEP_TYPE_LABEL[type]}
    </Badge>
  )
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

function readExpression(step: WorkflowRunStepRunDetail["step"]): string | null {
  const record = step as unknown as Record<string, unknown>
  return typeof record.expression === "string" && record.expression.trim()
    ? record.expression
    : null
}

export function WorkflowRunStepRun({
  stepRun,
  index,
}: WorkflowRunStepRunProps) {
  const [expanded, setExpanded] = useState(false)
  const stepType = resolveStepType(stepRun)
  const assertions = stepRun.assertionsResult ?? []
  const insights = stepRun.insights ?? []
  const skipped = !stepRun.startedAt || stepRun.status === "skipped"
  const status = skipped ? "skipped" : stepRun.status
  const elapsed = skipped ? 0 : stepElapsedMs(stepRun)
  const durationLabel = GetRunDuration(elapsed) || "—"
  const StatusIcon = STATUS_ICON[status] ?? ClockIcon

  const hasDetails =
    assertions.length > 0 ||
    insights.length > 0 ||
    stepType === "condition" ||
    stepType === "delay" ||
    stepRun.error != null ||
    (stepType === "http" && Boolean(stepRun.url || stepRun.responseSnapshot))

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card",
        expanded && "ring-1 ring-ring/30",
        status === "failed" && "border-rose-200",
        skipped && "opacity-60"
      )}
    >
      <div
        className={cn(
          "absolute top-0 left-0 h-full w-0.5 rounded-l-lg",
          status === "success" && "bg-emerald-500",
          status === "failed" && "bg-rose-500",
          status === "skipped" && "bg-slate-400",
          status === "cancelled" && "bg-orange-500",
          status === "waiting" && "bg-violet-500",
          status === "running" && "animate-pulse bg-sky-500",
          status === "pending" && "bg-amber-500"
        )}
      />

      <Button
        type="button"
        variant="ghost"
        aria-expanded={hasDetails ? expanded : undefined}
        onClick={() => {
          if (!hasDetails) return
          setExpanded((current) => !current)
        }}
        className={cn(
          "flex h-auto w-full items-center justify-start gap-3 rounded-lg px-4 py-3 text-left whitespace-normal",
          hasDetails
            ? "hover:bg-muted/60"
            : "cursor-default hover:bg-transparent"
        )}
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted font-mono text-xs font-semibold text-muted-foreground">
          {index + 1}
        </div>

        <StatusIcon
          className={cn(
            "size-4 shrink-0",
            STATUS_COLOR[status],
            status === "running" && "animate-spin"
          )}
        />

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium">{stepRun.name}</span>
          <StepTypeBadge type={stepType} />
        </div>

        {stepType === "http" && stepRun.url ? (
          <div className="hidden max-w-90 min-w-0 items-center gap-2 md:flex">
            <MethodBadge method={stepRun.method} />
            <span className="truncate font-mono text-xs text-muted-foreground">
              {stepRun.url}
            </span>
          </div>
        ) : null}

        {stepType === "condition" && readExpression(stepRun.step) ? (
          <div className="hidden items-center gap-1.5 md:flex">
            <GitBranchIcon className="size-3.5 text-muted-foreground" />
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {readExpression(stepRun.step)}
            </code>
          </div>
        ) : null}

        {stepType === "delay" && readDelaySeconds(stepRun.step) ? (
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
            <ClockIcon className="size-3.5" />
            {formatDelayDuration(readDelaySeconds(stepRun.step) ?? 0)}
          </div>
        ) : null}

        <div className="flex shrink-0 items-center gap-3">
          {stepRun.responseSnapshot && stepType === "http" ? (
            <Badge variant="outline" className="font-mono">
              {stepRun.responseSnapshot.status}
            </Badge>
          ) : null}
          {stepType === "condition" && stepRun.matchedBranch != null ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium",
                stepRun.matchedBranch
                  ? "text-emerald-700"
                  : "text-muted-foreground"
              )}
            >
              <GitBranchIcon className="size-3" />
              {stepRun.matchedBranch ? "True" : "False"}
            </span>
          ) : null}
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {durationLabel}
          </span>
          <StatusBadge status={status} />
          {hasDetails ? (
            <ChevronRightIcon
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-90"
              )}
            />
          ) : null}
        </div>
      </Button>

      {expanded && hasDetails ? (
        <div className="space-y-4 border-t px-4 py-4">
          {insights.length > 0 ? <InsightsPanel insights={insights} /> : null}
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
                      ? "bg-sky-500/60"
                      : "bg-sky-500/30"
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
