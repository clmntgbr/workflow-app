"use client"

import { DeleteEdgeButton } from "@/components/workflow/delete-edge-button"
import { CanvasStep, StepNode, StepNodeData } from "@/components/workflow/step-node"
import { WorkflowConnection } from "@/lib/workflow/types"
import {
  Background,
  BackgroundVariant,
  Connection,
  ConnectionLineType,
  Controls,
  Edge,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodeDrag,
  OnNodesChange,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { TimerIcon } from "lucide-react"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

const DELAY_DRAG_MIME = "application/workflow-delay"

const nodeTypes = { stepNode: StepNode }
const edgeTypes = { deleteEdge: DeleteEdgeButton }

export type EndpointDragPayload = {
  id: string
  name: string
  method: string
  path: string
  description: string | null
}

interface WorkflowCanvasProps {
  workflowId: string
  steps: CanvasStep[]
  connections: WorkflowConnection[]
  onCreateStep: (input: {
    endpointId: string
    position: { x: number; y: number }
    preview: EndpointDragPayload
  }) => Promise<void>
  onCreateDelayStep: (position: { x: number; y: number }) => Promise<void>
  onMoveStep: (
    stepId: string,
    position: { x: number; y: number }
  ) => Promise<void>
  onCreateConnection: (input: {
    sourceStepId: string
    targetStepId: string
  }) => Promise<WorkflowConnection>
  onDeleteConnection: (connectionId: string) => Promise<void>
  onEditStep: (step: CanvasStep) => void
  onDeleteStep: (stepId: string) => Promise<void>
}

function makeNodes(
  steps: CanvasStep[],
  onEdit: (step: CanvasStep) => void,
  onDelete: (stepId: string) => Promise<void>
): Node[] {
  return steps.map((step) => ({
    id: step.id,
    type: "stepNode",
    position: { x: step.x, y: step.y },
    data: {
      step,
      onEdit,
      onDelete,
    } satisfies StepNodeData,
  }))
}

function makeEdges(
  connections: WorkflowConnection[],
  onDelete: (id: string) => void
): Edge[] {
  return connections.map((connection) => ({
    id: connection.id,
    source: connection.sourceStepId,
    target: connection.targetStepId,
    type: "deleteEdge",
    data: { onDelete: () => onDelete(connection.id) },
  }))
}

function CanvasInner({
  workflowId,
  steps,
  connections,
  onCreateStep,
  onCreateDelayStep,
  onMoveStep,
  onCreateConnection,
  onDeleteConnection,
  onEditStep,
  onDeleteStep,
}: WorkflowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow()
  const propsRef = useRef({
    workflowId,
    steps,
    connections,
    onCreateStep,
    onCreateDelayStep,
    onMoveStep,
    onCreateConnection,
    onDeleteConnection,
    onEditStep,
    onDeleteStep,
  })

  useLayoutEffect(() => {
    propsRef.current = {
      workflowId,
      steps,
      connections,
      onCreateStep,
      onCreateDelayStep,
      onMoveStep,
      onCreateConnection,
      onDeleteConnection,
      onEditStep,
      onDeleteStep,
    }
  })

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const handleEdgeDelete = useCallback(async (connectionId: string) => {
    setEdges((current) => current.filter((edge) => edge.id !== connectionId))

    try {
      await propsRef.current.onDeleteConnection(connectionId)
    } catch {
      // Parent restores connections; edges sync back via props.
    }
  }, [])

  const handleEditStep = useCallback((step: CanvasStep) => {
    propsRef.current.onEditStep(step)
  }, [])

  const handleDeleteStep = useCallback(async (stepId: string) => {
    setNodes((current) => current.filter((node) => node.id !== stepId))
    setEdges((current) =>
      current.filter(
        (edge) => edge.source !== stepId && edge.target !== stepId
      )
    )

    try {
      await propsRef.current.onDeleteStep(stepId)
    } catch {
      // Parent restores steps/connections; nodes/edges sync back via props.
    }
  }, [])

  useEffect(() => {
    setNodes((previous) => {
      const next = makeNodes(steps, handleEditStep, handleDeleteStep)
      return next.map((node) => {
        const existing = previous.find((item) => item.id === node.id)
        return existing ? { ...node, position: existing.position } : node
      })
    })
  }, [steps, handleEditStep, handleDeleteStep])

  useEffect(() => {
    setEdges(makeEdges(connections, handleEdgeDelete))
  }, [connections, handleEdgeDelete])

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes((current) => applyNodeChanges(changes, current))
  }, [])

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((current) => applyEdgeChanges(changes, current))
  }, [])

  const onNodeDragStop: OnNodeDrag = useCallback(async (_event, node) => {
    await propsRef.current.onMoveStep(node.id, {
      x: Number(node.position.x.toFixed(2)),
      y: Number(node.position.y.toFixed(2)),
    })
  }, [])

  const onConnect: OnConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return

      const created = await propsRef.current.onCreateConnection({
        sourceStepId: connection.source,
        targetStepId: connection.target,
      })

      setEdges((current) =>
        addEdge(
          {
            ...connection,
            id: created.id,
            type: "deleteEdge",
            data: { onDelete: () => handleEdgeDelete(created.id) },
          },
          current
        )
      )
    },
    [handleEdgeDelete]
  )

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault()
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      const flowPosition = {
        x: Number(position.x.toFixed(2)),
        y: Number(position.y.toFixed(2)),
      }

      const delayRaw = event.dataTransfer.getData(DELAY_DRAG_MIME)
      if (delayRaw) {
        await propsRef.current.onCreateDelayStep(flowPosition)
        return
      }

      const raw = event.dataTransfer.getData("application/workflow-endpoint")
      if (!raw) return

      const endpoint = JSON.parse(raw) as EndpointDragPayload

      await propsRef.current.onCreateStep({
        endpointId: endpoint.id,
        position: flowPosition,
        preview: endpoint,
      })
    },
    [screenToFlowPosition]
  )

  const handleDelayDragStart = useCallback((event: React.DragEvent) => {
    event.dataTransfer.setData(DELAY_DRAG_MIME, "delay")
    event.dataTransfer.effectAllowed = "copy"
  }, [])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }, [])

  return (
    <div className="relative h-full min-h-0 w-full flex-1 overflow-hidden bg-[#f8f9fb]">
      <div className="pointer-events-none absolute top-4 right-4 z-10">
        <button
          type="button"
          draggable
          onDragStart={handleDelayDragStart}
          className="pointer-events-auto flex size-10 cursor-grab items-center justify-center rounded-lg border border-violet-200 bg-white text-violet-700 shadow-sm transition-colors hover:bg-violet-50 active:cursor-grabbing"
          aria-label="Drag delay step onto canvas"
          title="Drag to add a delay step"
        >
          <TimerIcon className="size-5" />
        </button>
      </div>

      <ReactFlow
        className="h-full w-full"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
        snapToGrid
        snapGrid={[5, 5]}
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        deleteKeyCode={null}
        connectionLineType={ConnectionLineType.SmoothStep}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <CanvasInner {...props} />
      </div>
    </ReactFlowProvider>
  )
}
