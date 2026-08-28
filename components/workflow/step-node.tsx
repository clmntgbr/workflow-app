"use client"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { StepPreview } from "@/components/workflow/step-preview"
import { Endpoint } from "@/lib/endpoint/types"
import { GetStatusStyle } from "@/lib/misc"
import { cn } from "@/lib/utils"
import { RunStatus } from "@/lib/workflow-run/types"
import { formatDelayDuration } from "@/lib/workflow/delay"
import { StepType } from "@/lib/workflow/types"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import {
  CheckIcon,
  ClockIcon,
  LoaderCircleIcon,
  MinusIcon,
  Pencil,
  TimerIcon,
  Trash2,
} from "lucide-react"
import { useState } from "react"

export type CanvasStep = {
  id: string
  type: StepType
  index?: string
  name: string
  description: string | null
  endpointId: string | null
  delayDurationSeconds: number | null
  method: string
  path: string
  headers: Record<string, string>
  query: Record<string, string | string[]>
  body: unknown
  timeout: number
  retryOnFailure: boolean
  retryCount: number
  retryDelay: number
  executionOrder?: number
  treeIndex?: number
  status?: string
  lastRunStatus?: RunStatus | null
  x: number
  y: number
  endpoint?: Endpoint
}

export type StepNodeData = {
  step: CanvasStep
  onEdit: (step: CanvasStep) => void
  onDelete: (stepId: string) => Promise<void>
}

export function isDelayStep(step: Pick<CanvasStep, "type">): boolean {
  return step.type === "delay"
}

function LastRunStatusIcon({ status }: { status: RunStatus }) {
  const style = GetStatusStyle(status)

  return (
    <span
      title={`Last run: ${style.label}`}
      aria-label={`Last run status: ${style.label}`}
      className="shrink-0"
    >
      {status === "success" ? (
        <span className="flex size-3 items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckIcon className="size-2 stroke-[3]" />
        </span>
      ) : null}
      {status === "failed" ? (
        <span className="flex size-3 items-center justify-center rounded-full bg-red-500 text-[8px] leading-none font-bold text-white">
          !
        </span>
      ) : null}
      {status === "running" || status === "pending" ? (
        <LoaderCircleIcon className="size-3 animate-spin text-amber-600" />
      ) : null}
      {status === "waiting" ? (
        <ClockIcon className="size-3 text-violet-600" />
      ) : null}
      {status === "cancelled" || status === "skipped" ? (
        <span className="flex size-3 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <MinusIcon className="size-2 stroke-[3]" />
        </span>
      ) : null}
    </span>
  )
}

function DelayStepNodeContent({ step }: { step: CanvasStep }) {
  const durationLabel =
    step.delayDurationSeconds != null
      ? formatDelayDuration(step.delayDurationSeconds)
      : "—"

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-violet-200 bg-violet-50 text-violet-700">
        <TimerIcon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-foreground">
          {step.name}
        </p>
      </div>
      <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
        {durationLabel}
      </span>
    </div>
  )
}

export function StepNode({ data }: NodeProps) {
  const { step, onEdit, onDelete } = data as unknown as StepNodeData
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const delayStep = isDelayStep(step)

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="z-50! size-2.5! border-gray-300! bg-foreground!"
      />

      <div
        className={cn(
          "group relative flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card transition-all duration-200",
          delayStep ? "w-48 border-violet-200/80 px-3 py-2" : "w-80 px-3 py-2",
          "hover:shadow-sm"
        )}
        onClick={() => onEdit(step)}
      >
        {delayStep ? (
          <DelayStepNodeContent step={step} />
        ) : (
          <StepPreview
            name={step.name}
            method={step.method}
            url={step.path}
            className="min-w-0 flex-1"
          />
        )}

        <div className="relative ml-auto h-6 w-10 shrink-0">
          {step.lastRunStatus ? (
            <div className="absolute inset-y-0 right-0 flex items-center transition-opacity duration-200 group-hover:opacity-0">
              <LastRunStatusIcon status={step.lastRunStatus} />
            </div>
          ) : null}

          <div className="absolute inset-y-0 -right-2 flex items-center gap-px rounded-full border border-border bg-background p-px opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
            <button
              type="button"
              aria-label="Edit step"
              className="nodrag nopan grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
              onClick={(event) => {
                event.stopPropagation()
                onEdit(step)
              }}
            >
              <Pencil className="size-3" strokeWidth={1.6} />
            </button>
            <button
              type="button"
              aria-label="Delete step"
              className="nodrag nopan grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              onClick={(event) => {
                event.stopPropagation()
                setIsDeleteOpen(true)
              }}
            >
              <Trash2 className="size-3" strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!z-50 !size-2.5 !border-gray-300 !bg-foreground"
      />

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete step"
        description="This action cannot be undone. The step and all its connections will be permanently removed from the workflow."
        onConfirm={() => onDelete(step.id)}
        onDeleted={() => undefined}
        errorMessage="Failed to delete step. Please try again."
      />
    </>
  )
}
