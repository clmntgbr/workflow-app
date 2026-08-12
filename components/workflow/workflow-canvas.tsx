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
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

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
  }) => Promise<void>
  onMoveStep: (
    stepId: string,
    position: { x: number; y: number }
  ) => Promise<void>
  onCreateConnection: (input: {
    sourceStepId: string
    targetStepId: string
  }) => Promise<WorkflowConnection>
  onDeleteConnection: (connectionId: string) => Promise<void>
}

function makeNodes(steps: CanvasStep[]): Node[] {
  return steps.map((step) => ({
    id: step.id,
    type: "stepNode",
    position: { x: step.x, y: step.y },
    data: { step } satisfies StepNodeData,
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
  onMoveStep,
  onCreateConnection,
  onDeleteConnection,
}: WorkflowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow()
  const propsRef = useRef({
    workflowId,
    steps,
    connections,
    onCreateStep,
    onMoveStep,
    onCreateConnection,
    onDeleteConnection,
  })

  useLayoutEffect(() => {
    propsRef.current = {
      workflowId,
      steps,
      connections,
      onCreateStep,
      onMoveStep,
      onCreateConnection,
      onDeleteConnection,
    }
  })

  const handleEdgeDelete = useCallback(async (connectionId: string) => {
    await propsRef.current.onDeleteConnection(connectionId)
  }, [])

  const [nodes, setNodes] = useState<Node[]>(() => makeNodes(steps))
  const [edges, setEdges] = useState<Edge[]>(() =>
    makeEdges(connections, handleEdgeDelete)
  )

  useEffect(() => {
    setNodes((previous) => {
      const next = makeNodes(steps)
      return next.map((node) => {
        const existing = previous.find((item) => item.id === node.id)
        return existing ? { ...node, position: existing.position } : node
      })
    })
  }, [steps])

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
      const raw = event.dataTransfer.getData("application/workflow-endpoint")
      if (!raw) return

      const endpoint = JSON.parse(raw) as EndpointDragPayload
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      await propsRef.current.onCreateStep({
        endpointId: endpoint.id,
        position: {
          x: Number(position.x.toFixed(2)),
          y: Number(position.y.toFixed(2)),
        },
      })
    },
    [screenToFlowPosition]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }, [])

  return (
    <div className="relative h-[640px] min-h-0 w-full flex-1 overflow-hidden rounded-lg border bg-[#f8f9fb]">
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
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
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
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}
