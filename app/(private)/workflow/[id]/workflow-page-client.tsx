"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  EndpointDragPayload,
  WorkflowCanvas,
} from "@/components/workflow/workflow-canvas"
import { CanvasStep } from "@/components/workflow/step-node"
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
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface WorkflowPageClientProps {
  workflowId: string
}

type Point = { x: number; y: number }

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null
}

function pickString(
  record: Record<string, unknown>,
  keys: string[]
): string | null {
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

export function WorkflowPageClient({ workflowId }: WorkflowPageClientProps) {
  const router = useRouter()
  const { activeOrganization } = useOrganization()
  const { endpoints, isLoading: isEndpointsLoading } = useEndpoint()

  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [steps, setSteps] = useState<CanvasStep[]>([])
  const [connections, setConnections] = useState<WorkflowConnection[]>([])

  const endpointById = new Map(
    endpoints.members.map((endpoint) => [endpoint.id, endpoint])
  )

  const loadSteps = useCallback(async () => {
    const payload = await getWorkflowSteps(workflowId)
    const nextSteps = listFromPayload(payload)
      .map((item) => {
        const record = asRecord(item)
        if (!record) return null

        const id = pickString(record, ["id", "stepId", "step_id"])
        const endpointId = pickString(record, ["endpointId", "endpoint_id"])
        const stepName = pickString(record, ["name", "stepName", "step_name"])
        const position = parsePosition(record.position)

        if (!id || !endpointId || !position) return null

        const endpoint = endpointById.get(endpointId)

        return {
          id,
          name: stepName ?? endpoint?.name ?? endpointId,
          endpointId,
          method: endpoint?.method ?? "GET",
          path: endpoint?.url ?? "/",
          description: endpoint?.description ?? null,
          x: position.x,
          y: position.y,
        } satisfies CanvasStep
      })
      .filter((value): value is CanvasStep => value !== null)

    setSteps(nextSteps)
  }, [workflowId, endpoints.members])

  const loadConnections = useCallback(async () => {
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
  }, [workflowId])

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
  }, [activeOrganization?.id, loadSteps, loadConnections])

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

  const handleCreateStep = async (input: {
    endpointId: string
    position: Point
  }) => {
    try {
      await createWorkflowStep(workflowId, {
        endpointId: input.endpointId,
        position: input.position,
      })
      await Promise.all([loadSteps(), loadConnections()])
      toast.success("Step created")
    } catch (creationError) {
      toast.error(
        creationError instanceof Error
          ? creationError.message
          : "Failed to create step"
      )
      throw creationError
    }
  }

  const handleMoveStep = async (stepId: string, position: Point) => {
    const previous = steps.find((step) => step.id === stepId)
    if (!previous) return

    setSteps((current) =>
      current.map((step) =>
        step.id === stepId ? { ...step, x: position.x, y: position.y } : step
      )
    )

    try {
      await updateStepPosition(workflowId, stepId, { position })
    } catch (moveError) {
      setSteps((current) =>
        current.map((step) =>
          step.id === stepId
            ? { ...step, x: previous.x, y: previous.y }
            : step
        )
      )
      toast.error(
        moveError instanceof Error ? moveError.message : "Failed to move step"
      )
    }
  }

  const handleCreateConnection = async (input: {
    sourceStepId: string
    targetStepId: string
  }) => {
    try {
      const created = await createWorkflowConnection(workflowId, input)
      await loadConnections()
      return created
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Failed to create connection"
      )
      throw saveError
    }
  }

  const handleDeleteConnection = async (connectionId: string) => {
    try {
      await deleteWorkflowConnection(workflowId, connectionId)
      await loadConnections()
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete connection"
      )
      throw deleteError
    }
  }

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
            Drag an endpoint onto the canvas. Connect steps by dragging from a
            bottom handle to a top handle.
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
                    draggable
                    onDragStart={(event) => {
                      const payload: EndpointDragPayload = {
                        id: endpoint.id,
                        name: endpoint.name,
                        method: endpoint.method,
                        path: endpoint.url,
                        description: endpoint.description,
                      }
                      event.dataTransfer.setData(
                        "application/workflow-endpoint",
                        JSON.stringify(payload)
                      )
                      event.dataTransfer.effectAllowed = "copy"
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
          <h2 className="text-sm font-semibold">Workflow Canvas</h2>
          <WorkflowCanvas
            workflowId={workflowId}
            steps={steps}
            connections={connections}
            onCreateStep={handleCreateStep}
            onMoveStep={handleMoveStep}
            onCreateConnection={handleCreateConnection}
            onDeleteConnection={handleDeleteConnection}
          />
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
