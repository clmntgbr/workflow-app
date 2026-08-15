"use client"

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react"
import { Trash2Icon, TrashIcon, XIcon } from "lucide-react"
import { Button } from "../ui/button"

export type DeleteEdgeData = {
  onDelete: () => void
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
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const onDelete = (data as DeleteEdgeData | undefined)?.onDelete

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
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
