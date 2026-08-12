"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { WorkflowDrawer } from "@/components/workflow/workflow-drawer"
import { WorkflowNotFoundView } from "@/components/workflow/workflow-not-found-view"
import { useEndpoint } from "@/lib/endpoint/context"
import { useOrganization } from "@/lib/organization/context"
import {
  createWorkflowConnection,
  createWorkflowStep,
  deleteWorkflowConnection,
  getWorkflow,
  getWorkflowConnections,
  getWorkflowSteps,
  updateStepPosition,
  WorkflowNotFoundError,
} from "@/lib/workflow/api"
import { Workflow, WorkflowConnection } from "@/lib/workflow/types"
import { ArrowLeftIcon, SettingsIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

interface WorkflowPageClientProps {
  workflowId: string
}

type PlacedStep = {
  id: string
  index: string
  name: string
  endpointId: string
  endpointName: string
  x: number
  y: number
}

type RenderedConnection = WorkflowConnection & {
  source: PlacedStep
  target: PlacedStep
}

type Point = { x: number; y: number }

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string") return value
  }
  return null
}

function listFromPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  const record = asRecord(payload)
  if (!record) return []
  if (Array.isArray(record.members)) return record.members
  if (Array.isArray(record.data)) return record.data
  const dataRecord = asRecord(record.data)
  if (dataRecord && Array.isArray(dataRecord.members)) return dataRecord.members
  return []
}

function parsePosition(position: unknown): Point | null {
  const record = asRecord(position)
  if (!record) return null

  const x = record.x
  const y = record.y

  if (typeof x !== "number" || typeof y !== "number") {
    return null
  }

  return { x, y }
}

function clampPoint(point: Point, bounds: DOMRect): Point {
  return {
    x: Math.max(0, Math.min(bounds.width, Number(point.x.toFixed(2)))),
    y: Math.max(0, Math.min(bounds.height, Number(point.y.toFixed(2)))),
  }
}

export function WorkflowPageClient({ workflowId }: WorkflowPageClientProps) {
  const router = useRouter()
  const { activeOrganization } = useOrganization()
  const { endpoints, isLoading: isEndpointsLoading } = useEndpoint()

  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const [draggedEndpointId, setDraggedEndpointId] = useState<string | null>(null)
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null)
  const [dropPreview, setDropPreview] = useState<Point | null>(null)

  const [isCreatingStep, setIsCreatingStep] = useState(false)
  const [isSavingConnection, setIsSavingConnection] = useState(false)
  const [steps, setSteps] = useState<PlacedStep[]>([])
  const [connections, setConnections] = useState<WorkflowConnection[]>([])
  const [sourceConnectionStepId, setSourceConnectionStepId] =
    useState<string | null>(null)

  const gridRef = useRef<HTMLDivElement | null>(null)

  const endpointNameById = new Map(
    endpoints.members.map((endpoint) => [endpoint.id, endpoint.name])
  )

  const loadSteps = async () => {
    const payload = await getWorkflowSteps(workflowId)
    const nextSteps = listFromPayload(payload)
      .map((item) => {
        const record = asRecord(item)
        if (!record) return null

        const id = pickString(record, ["id", "stepId", "step_id"])
        const endpointId = pickString(record, ["endpointId", "endpoint_id"])
        const stepName = pickString(record, ["name", "stepName", "step_name"])
        const indexRaw =
          typeof record.index === "string" || typeof record.index === "number"
            ? String(record.index)
            : null
        const position = parsePosition(record.position)

        if (!id || !endpointId || !indexRaw || !position) return null

        return {
          id,
          index: indexRaw,
          name: stepName ?? endpointNameById.get(endpointId) ?? endpointId,
          endpointId,
          endpointName: endpointNameById.get(endpointId) ?? endpointId,
          x: position.x,
          y: position.y,
        } satisfies PlacedStep
      })
      .filter((value): value is PlacedStep => value !== null)

    setSteps(nextSteps)
  }

  const loadConnections = async () => {
    const payload = await getWorkflowConnections(workflowId)
    const nextConnections = listFromPayload(payload)
      .map((item) => {
        const record = asRecord(item)
        if (!record) return null

        const id = pickString(record, ["id", "connectionId", "connection_id"])
        const sourceStepId = pickString(record, [
          "sourceStepId",
          "source_step_id",
        ])
        const targetStepId = pickString(record, [
          "targetStepId",
          "target_step_id",
        ])

        if (!id || !sourceStepId || !targetStepId) return null

        return { id, sourceStepId, targetStepId } satisfies WorkflowConnection
      })
      .filter((value): value is WorkflowConnection => value !== null)

    setConnections(nextConnections)
  }

  const recomputeExecutionFromConnections = async (items: PlacedStep[]) => {
    if (items.length === 0) return

    await Promise.all(
      items.map((step) =>
        updateStepPosition(workflowId, step.id, {
          position: { x: step.x, y: step.y },
        })
      )
    )
  }

  useEffect(() => {
    if (!activeOrganization?.id) return

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setIsNotFound(false)
      setError(null)

      try {
        const next = await getWorkflow(workflowId)
        if (!cancelled) setWorkflow(next)
      } catch (err) {
        if (cancelled) return

        if (err instanceof WorkflowNotFoundError) {
          setIsNotFound(true)
          setWorkflow(null)
          return
        }

        setError("Failed to load workflow")
        setWorkflow(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [workflowId, activeOrganization?.id])

  useEffect(() => {
    if (!activeOrganization?.id) return

    let cancelled = false

    const load = async () => {
      try {
        await Promise.all([loadSteps(), loadConnections()])
      } catch {
        if (!cancelled) {
          setSteps([])
          setConnections([])
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [workflowId, activeOrganization?.id, endpoints.members.length])

  if (!activeOrganization?.id || isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isNotFound) return <WorkflowNotFoundView />

  if (error || !workflow) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          {error ?? "Failed to load workflow"}
        </p>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeftIcon className="size-4" />
            Back to workflows
          </Link>
        </Button>
      </div>
    )
  }

  const handleMoveStep = async (stepId: string, position: Point) => {
    const step = steps.find((placed) => placed.id === stepId)
    if (!step) return

    const previous = { x: step.x, y: step.y }

    setSteps((current) =>
      current.map((item) =>
        item.id === stepId ? { ...item, x: position.x, y: position.y } : item
      )
    )

    try {
      await updateStepPosition(workflowId, stepId, {
        position,
      })
    } catch (moveError) {
      setSteps((current) =>
        current.map((item) =>
          item.id === stepId ? { ...item, x: previous.x, y: previous.y } : item
        )
      )
      toast.error(
        moveError instanceof Error ? moveError.message : "Failed to move step"
      )
    } finally {
      setDraggedStepId(null)
      setDropPreview(null)
    }
  }

  const handleDropEndpoint = async (position: Point, endpointIdFromDrop?: string) => {
    const endpointId = endpointIdFromDrop || draggedEndpointId
    if (!endpointId || isCreatingStep) return

    const endpoint = endpoints.members.find((member) => member.id === endpointId)
    if (!endpoint) {
      toast.error("Endpoint not found")
      return
    }

    setIsCreatingStep(true)
    try {
      await createWorkflowStep(workflowId, {
        endpointId: endpoint.id,
        position,
      })
      await Promise.all([loadSteps(), loadConnections()])
      toast.success("Step created")
    } catch (creationError) {
      toast.error(
        creationError instanceof Error
          ? creationError.message
          : "Failed to create step"
      )
    } finally {
      setIsCreatingStep(false)
      setDraggedEndpointId(null)
      setDropPreview(null)
    }
  }

  const handleSelectConnectionSource = (stepId: string) => {
    setSourceConnectionStepId((current) => (current === stepId ? null : stepId))
  }

  const handleCreateConnection = async (targetStepId: string) => {
    if (!sourceConnectionStepId || isSavingConnection) return
    if (sourceConnectionStepId === targetStepId) {
      toast.error("Source and target steps must be different")
      return
    }

    const exists = connections.some(
      (connection) =>
        connection.sourceStepId === sourceConnectionStepId &&
        connection.targetStepId === targetStepId
    )
    if (exists) {
      toast.error("Connection already exists")
      return
    }

    setIsSavingConnection(true)
    try {
      await createWorkflowConnection(workflowId, {
        sourceStepId: sourceConnectionStepId,
        targetStepId,
      })
      await recomputeExecutionFromConnections(steps)
      await Promise.all([loadSteps(), loadConnections()])
      setSourceConnectionStepId(null)
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Failed to create connection"
      )
    } finally {
      setIsSavingConnection(false)
    }
  }

  const handleDeleteConnection = async (connectionId: string) => {
    try {
      await deleteWorkflowConnection(workflowId, connectionId)
      await recomputeExecutionFromConnections(steps)
      await Promise.all([loadSteps(), loadConnections()])
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete connection"
      )
    }
  }

  const stepById = new Map(steps.map((step) => [step.id, step]))
  const renderedConnections: RenderedConnection[] = connections
    .map((connection) => {
      const source = stepById.get(connection.sourceStepId)
      const target = stepById.get(connection.targetStepId)
      if (!source || !target) return null
      return { ...connection, source, target }
    })
    .filter((item): item is RenderedConnection => item !== null)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <Button variant="ghost" size="sm" className="-ms-2" asChild>
            <Link href="/">
              <ArrowLeftIcon className="size-4" />
              Workflows
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-xl font-semibold">{workflow.name}</h1>
            <span className="rounded-md border px-2 py-0.5 text-xs capitalize text-muted-foreground">
              {workflow.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {workflow.description || "No description"}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Edit workflow"
        >
          <SettingsIcon className="size-4" />
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-3 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Endpoints</h2>
          <p className="text-xs text-muted-foreground">
            Drag/drop endpoints. For connections: click bottom point on source,
            then top point on target.
          </p>
          {isEndpointsLoading && endpoints.members.length === 0 ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : endpoints.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No endpoints available.</p>
          ) : (
            <ul className="space-y-2">
              {endpoints.members.map((endpoint) => (
                <li key={endpoint.id}>
                  <button
                    type="button"
                    draggable={!isCreatingStep}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", endpoint.id)
                      setDraggedEndpointId(endpoint.id)
                    }}
                    onDragEnd={() => {
                      setDraggedEndpointId(null)
                      setDropPreview(null)
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left hover:bg-muted/50"
                  >
                    <span className="truncate text-sm font-medium">
                      {endpoint.name}
                    </span>
                    <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                      {endpoint.method}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Workflow Grid</h2>
          <div
            ref={gridRef}
            onDragOver={(event) => {
              event.preventDefault()
              const bounds = gridRef.current?.getBoundingClientRect()
              if (!bounds || isCreatingStep) return

              const next = clampPoint(
                {
                  x: event.clientX - bounds.left,
                  y: event.clientY - bounds.top,
                },
                bounds
              )
              setDropPreview(next)
            }}
            onDragLeave={() => setDropPreview(null)}
            onDrop={(event) => {
              event.preventDefault()
              const bounds = gridRef.current?.getBoundingClientRect()
              if (!bounds) return

              const point = clampPoint(
                {
                  x: event.clientX - bounds.left,
                  y: event.clientY - bounds.top,
                },
                bounds
              )

              const movingStepId = event.dataTransfer.getData("application/step-id")
              if (movingStepId) {
                void handleMoveStep(movingStepId, point)
                return
              }

              const endpointId = event.dataTransfer.getData("text/plain")
              void handleDropEndpoint(point, endpointId)
            }}
            className="relative h-[520px] rounded-lg border bg-background"
            style={{
              backgroundImage:
                "radial-gradient(circle, hsl(var(--muted-foreground)/0.25) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            {dropPreview ? (
              <div
                className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background"
                style={{ left: `${dropPreview.x}px`, top: `${dropPreview.y}px` }}
              />
            ) : null}

            {renderedConnections.map((connection) => {
              const dx = connection.target.x - connection.source.x
              const dy = connection.target.y - connection.source.y
              const length = Math.hypot(dx, dy)
              const angle = (Math.atan2(dy, dx) * 180) / Math.PI

              return (
                <div
                  key={`${connection.id}-line`}
                  className="pointer-events-none absolute z-10 h-[2px] origin-left bg-primary"
                  style={{
                    left: `${connection.source.x}px`,
                    top: `${connection.source.y}px`,
                    width: `${length}px`,
                    transform: `rotate(${angle}deg)`,
                  }}
                />
              )
            })}

            {renderedConnections.map((connection) => {
              const middleX = (connection.source.x + connection.target.x) / 2
              const middleY = (connection.source.y + connection.target.y) / 2
              return (
                <button
                  key={`${connection.id}-delete`}
                  type="button"
                  className="absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-background px-2 py-0.5 text-[10px] shadow-sm hover:bg-muted"
                  style={{ left: `${middleX}px`, top: `${middleY}px` }}
                  onClick={() => void handleDeleteConnection(connection.id)}
                  aria-label="Delete connection"
                >
                  x
                </button>
              )
            })}

            {steps.map((step) => (
              <div
                key={step.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/step-id", step.id)
                  event.dataTransfer.effectAllowed = "move"
                  setDraggedStepId(step.id)
                }}
                onDragEnd={() => {
                  setDraggedStepId(null)
                  setDropPreview(null)
                }}
                className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-md border bg-background px-2 py-1 shadow-sm active:cursor-grabbing ${
                  draggedStepId === step.id ? "opacity-50" : ""
                }`}
                style={{ left: `${step.x}px`, top: `${step.y}px` }}
              >
                <button
                  type="button"
                  className={`absolute -top-2 left-1/2 size-3 -translate-x-1/2 rounded-full border ${
                    sourceConnectionStepId
                      ? "border-primary bg-primary/20"
                      : "border-muted-foreground/60 bg-background"
                  }`}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleCreateConnection(step.id)
                  }}
                  aria-label="Connect to this step"
                />

                <p className="max-w-44 truncate text-xs font-medium">{step.name}</p>

                <button
                  type="button"
                  className={`absolute -bottom-2 left-1/2 size-3 -translate-x-1/2 rounded-full border ${
                    sourceConnectionStepId === step.id
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/60 bg-background"
                  }`}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleSelectConnectionSource(step.id)
                  }}
                  aria-label="Use as source connection"
                />
              </div>
            ))}

            {steps.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Drop an endpoint anywhere on the dotted grid.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <WorkflowDrawer
        workflow={workflow}
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onSaved={setWorkflow}
        onDeleted={() => router.push("/")}
      />
    </div>
  )
}
