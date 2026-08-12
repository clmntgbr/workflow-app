"use client"

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react"
import { XIcon } from "lucide-react"

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
        <button
          type="button"
          className="nodrag nopan absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
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
          <XIcon className="size-3" />
        </button>
      </EdgeLabelRenderer>
    </>
  )
}
