"use client"

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react"
import { ConditionBranch } from "@/lib/workflow/condition"
import { Trash2Icon } from "lucide-react"
import { Button } from "../ui/button"

export type DeleteEdgeData = {
  onDelete: () => void
  branch?: ConditionBranch | null
  highlighted?: boolean
}

export function DeleteEdgeButton({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const edgeData = data as DeleteEdgeData | undefined
  const onDelete = edgeData?.onDelete
  const branch = edgeData?.branch
  const highlighted = edgeData?.highlighted ?? false

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const isTrueBranch = branch === "true"
  const isFalseBranch = branch === "false"
  const edgeStyle = {
    ...style,
    stroke: isTrueBranch
      ? "#10b981"
      : isFalseBranch
        ? "#ef4444"
        : style?.stroke,
    strokeWidth: highlighted
      ? 3
      : isTrueBranch || isFalseBranch
        ? 2.5
        : style?.strokeWidth,
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      <EdgeLabelRenderer>
        <Button
          variant="destructive"
          className="nodrag nopan absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white hover:bg-white hover:text-red-700"
          style={{
            left: labelX,
            top: labelY,
            pointerEvents: "all",
          }}
          onClick={(event) => {
            event.stopPropagation()
            onDelete?.()
          }}
          aria-label="Delete connection"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </EdgeLabelRenderer>
    </>
  )
}
