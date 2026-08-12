"use client"

import { cn } from "@/lib/utils"
import { Handle, Position, type NodeProps } from "@xyflow/react"

export type CanvasStep = {
  id: string
  name: string
  endpointId: string
  method: string
  path: string
  description: string | null
  x: number
  y: number
}

export type StepNodeData = {
  step: CanvasStep
}

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-700 border-emerald-200",
  POST: "bg-blue-50 text-blue-700 border-blue-200",
  PUT: "bg-amber-50 text-amber-700 border-amber-200",
  PATCH: "bg-orange-50 text-orange-700 border-orange-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
  HEAD: "bg-slate-50 text-slate-700 border-slate-200",
  OPTIONS: "bg-violet-50 text-violet-700 border-violet-200",
}

export function StepNode({ data }: NodeProps) {
  const step = (data as StepNodeData).step
  const method = (step.method || "GET").toUpperCase()
  const methodClass =
    METHOD_STYLES[method] ?? "bg-muted text-muted-foreground border-border"

  return (
    <div className="w-64 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
      <Handle
        type="target"
        position={Position.Top}
        className="!size-2.5 !border-gray-300 !bg-white"
      />

      <p className="truncate text-[13px] font-semibold text-foreground">
        {step.name}
      </p>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-2.5 !border-gray-300 !bg-white"
      />
    </div>
  )
}
