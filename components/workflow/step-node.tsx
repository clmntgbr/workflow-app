"use client"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { StepPreview } from "@/components/workflow/step-preview"
import { Endpoint } from "@/lib/endpoint/types"
import { cn } from "@/lib/utils"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { PencilIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"

export type CanvasStep = {
  id: string
  index?: string
  name: string
  description: string | null
  endpointId: string
  method: string
  path: string
  headers: Record<string, string>
  query: Record<string, string>
  body: unknown
  timeout: number
  retryOnFailure: boolean
  retryCount: number
  retryDelay: number
  executionOrder?: number
  treeIndex?: number
  status?: string
  x: number
  y: number
  endpoint?: Endpoint
}

export type StepNodeData = {
  step: CanvasStep
  onEdit: (step: CanvasStep) => void
  onDelete: (stepId: string) => Promise<void>
}

export function StepNode({ data }: NodeProps) {
  const { step, onEdit, onDelete } = data as unknown as StepNodeData
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="z-50! size-2.5! border-gray-300! bg-foreground!"
      />

      <div
        className={cn(
          "group relative flex w-64 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-2 transition-all duration-200",
          "hover:shadow-sm"
        )}
        onClick={() => onEdit(step)}
      >
        <div
          className={cn(
            "absolute top-1/2 -right-2 z-10 flex -translate-y-1/2 flex-col gap-1",
            "opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          )}
        >
          <button
            type="button"
            aria-label="Edit step"
            className="nodrag nopan flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation()
              onEdit(step)
            }}
          >
            <PencilIcon className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Delete step"
            className="nodrag nopan flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
            onClick={(event) => {
              event.stopPropagation()
              setIsDeleteOpen(true)
            }}
          >
            <Trash2Icon className="size-3.5" />
          </button>
        </div>

        <StepPreview
          name={step.name}
          method={step.method}
          url={step.path}
          className="min-w-0 flex-1"
        />
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
