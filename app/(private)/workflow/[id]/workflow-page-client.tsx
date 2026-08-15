"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EndpointDrawer } from "@/components/endpoint/endpoint-drawer"
import {
  EndpointDragPayload,
  WorkflowCanvas,
} from "@/components/workflow/workflow-canvas"
import { CanvasStep } from "@/components/workflow/step-node"
import { StepDrawer } from "@/components/workflow/step-drawer"
import { WorkflowDrawer } from "@/components/workflow/workflow-drawer"
import { WorkflowNotFoundView } from "@/components/workflow/workflow-not-found-view"
import { WorkflowRunsPanel } from "@/components/workflow/workflow-runs-panel"
import { SwitchOrganizationDialog } from "@/components/workflow/switch-organization-dialog"
import { cn } from "@/lib/utils"
import { useEndpoint } from "@/lib/endpoint/context"
import { Endpoint } from "@/lib/endpoint/types"
import { useOrganization } from "@/lib/organization/context"
import {
  createWorkflowConnection,
  createWorkflowStep,
  deleteWorkflowConnection,
  deleteWorkflowStep,
  getWorkflow,
  getWorkflowConnections,
  getWorkflowSteps,
  updateStepPosition,
  updateWorkflowStep,
  WorkflowNotFoundError,
  WorkflowWrongOrganizationError,
} from "@/lib/workflow/api"
import { subscribeWorkflowConnectionsRefetch } from "@/lib/workflow/connection-realtime"
import { subscribeWorkflowStepsRefetch } from "@/lib/workflow/step-realtime"
import {
  UpdateWorkflowStepInput,
  Workflow,
  WorkflowConnection,
} from "@/lib/workflow/types"
import { listWorkflowVariables } from "@/lib/workflow/variable/api"
import { WorkflowVariable } from "@/lib/workflow/variable/types"
import { ArrowLeftIcon, SettingsIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

interface WorkflowPageClientProps {
  workflowId: string
}

type Point = { x: number; y: number }

type WorkflowPageTab = "canvas" | "runs"

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

function pickNumber(
  record: Record<string, unknown>,
  keys: string[],
  fallback = 0
): number {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
  }
  return fallback
}

function pickBoolean(
  record: Record<string, unknown>,
  keys: string[],
  fallback = false
): boolean {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "boolean") return value
  }
  return fallback
}

function parseStringRecord(value: unknown): Record<string, string> {
  const record = asRecord(value)
  if (!record) return {}

  const result: Record<string, string> = {}
  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry === "string") result[key] = entry
  }
  return result
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
  const { activeOrganization, activateOrganization, organizations } =
    useOrganization()
  const { endpoints, isLoading: isEndpointsLoading } = useEndpoint()

  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wrongOrganization, setWrongOrganization] = useState<{
    organizationId: string
    organizationName: string
  } | null>(null)
  const [isSwitchOrganizationOpen, setIsSwitchOrganizationOpen] =
    useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedStep, setSelectedStep] = useState<CanvasStep | null>(null)
  const [isStepDrawerOpen, setIsStepDrawerOpen] = useState(false)
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(
    null
  )
  const [isEndpointDrawerOpen, setIsEndpointDrawerOpen] = useState(false)
  const [steps, setSteps] = useState<CanvasStep[]>([])
  const [connections, setConnections] = useState<WorkflowConnection[]>([])
  const [variables, setVariables] = useState<WorkflowVariable[]>([])
  const [activeTab, setActiveTab] = useState<WorkflowPageTab>("canvas")

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
        const url = pickString(record, ["url", "path"])
        const method = pickString(record, ["method"])
        const indexRaw =
          typeof record.index === "string" || typeof record.index === "number"
            ? String(record.index)
            : undefined
        const position = parsePosition(record.position)

        if (!id || !endpointId || !position) return null

        const endpoint = endpointById.get(endpointId)
        const descriptionValue = record.description
        const description =
          typeof descriptionValue === "string"
            ? descriptionValue
            : descriptionValue === null
              ? null
              : (endpoint?.description ?? null)

        return {
          id,
          ...(indexRaw ? { index: indexRaw } : {}),
          name: stepName ?? endpoint?.name ?? endpointId,
          description,
          endpointId,
          method: method ?? endpoint?.method ?? "GET",
          path: url ?? endpoint?.url ?? "/",
          headers: parseStringRecord(record.headers),
          query: parseStringRecord(record.query),
          body: record.body ?? endpoint?.body ?? {},
          timeout: pickNumber(
            record,
            ["timeout", "timeoutMs", "timeout_ms"],
            endpoint?.timeout ?? 30000
          ),
          retryOnFailure: pickBoolean(
            record,
            ["retryOnFailure", "retry_on_failure"],
            endpoint?.retryOnFailure ?? false
          ),
          retryCount: pickNumber(
            record,
            ["retryCount", "retry_count"],
            endpoint?.retryCount ?? 0
          ),
          retryDelay: pickNumber(
            record,
            ["retryDelay", "retryDelayMs", "retry_delay_ms"],
            endpoint?.retryDelay ?? 1000
          ),
          executionOrder: pickNumber(record, [
            "executionOrder",
            "execution_order",
          ]),
          treeIndex: pickNumber(record, ["treeIndex", "tree_index"]),
          status: pickString(record, ["status"]) ?? undefined,
          x: position.x,
          y: position.y,
        } as CanvasStep
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

  const loadVariables = useCallback(async () => {
    const next = await listWorkflowVariables(workflowId)
    setVariables(next)
  }, [workflowId])

  useEffect(() => {
    if (!activeOrganization?.id) return

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setIsNotFound(false)
      setWrongOrganization(null)
      setIsSwitchOrganizationOpen(false)
      setError(null)

      try {
        const next = await getWorkflow(workflowId)
        if (!cancelled) setWorkflow(next)
      } catch (err) {
        if (cancelled) return

        if (err instanceof WorkflowWrongOrganizationError) {
          setWrongOrganization({
            organizationId: err.organizationId,
            organizationName: err.organizationName,
          })
          setIsSwitchOrganizationOpen(true)
          setWorkflow(null)
          setIsLoading(false)
          return
        }

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
        await Promise.all([loadSteps(), loadConnections(), loadVariables()])
      } catch {
        if (!cancelled) {
          setSteps([])
          setConnections([])
          setVariables([])
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [activeOrganization?.id, loadSteps, loadConnections, loadVariables])

  useEffect(() => {
    return subscribeWorkflowStepsRefetch(workflowId, () => {
      void loadSteps()
    })
  }, [workflowId, loadSteps])

  useEffect(() => {
    return subscribeWorkflowConnectionsRefetch(workflowId, () => {
      void loadConnections()
    })
  }, [workflowId, loadConnections])

  if (!activeOrganization?.id || isLoading) {
    return (
      <div className="h-full space-y-4 overflow-auto p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (wrongOrganization) {
    const knownOrg = organizations.find(
      (organization) => organization.id === wrongOrganization.organizationId
    )

    return (
      <>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Wrong organization</h1>
            <p className="max-w-md text-sm text-muted-foreground">
              This workflow belongs to{" "}
              <span className="font-medium text-foreground">
                {knownOrg?.name ?? wrongOrganization.organizationName}
              </span>
              . Switch organization to open it.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeftIcon className="size-4" />
                Back to workflows
              </Link>
            </Button>
            <Button onClick={() => setIsSwitchOrganizationOpen(true)}>
              Switch organization
            </Button>
          </div>
        </div>
        <SwitchOrganizationDialog
          open={isSwitchOrganizationOpen}
          onOpenChange={setIsSwitchOrganizationOpen}
          organizationName={
            knownOrg?.name ?? wrongOrganization.organizationName
          }
          onConfirm={async () => {
            await activateOrganization(wrongOrganization.organizationId)
            setWrongOrganization(null)
            setIsSwitchOrganizationOpen(false)
          }}
        />
      </>
    )
  }

  if (isNotFound) return <WorkflowNotFoundView />

  if (error || !workflow) {
    return (
      <div className="h-full space-y-4 overflow-auto p-6">
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
    preview: EndpointDragPayload
  }) => {
    const endpoint = endpointById.get(input.endpointId)
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticStep: CanvasStep = {
      id: tempId,
      name: input.preview.name || endpoint?.name || "Step",
      description: input.preview.description ?? endpoint?.description ?? null,
      endpointId: input.endpointId,
      method: input.preview.method || endpoint?.method || "GET",
      path: input.preview.path || endpoint?.url || "/",
      headers: endpoint?.headers ?? {},
      query: endpoint?.query ?? {},
      body: endpoint?.body ?? {},
      timeout: endpoint?.timeout ?? 30000,
      retryOnFailure: endpoint?.retryOnFailure ?? false,
      retryCount: endpoint?.retryCount ?? 0,
      retryDelay: endpoint?.retryDelay ?? 1000,
      x: input.position.x,
      y: input.position.y,
    }

    setSteps((current) => [...current, optimisticStep])

    try {
      const created = await createWorkflowStep(workflowId, {
        endpointId: input.endpointId,
        position: input.position,
      })

      const record = asRecord(created)
      const createdId = record
        ? pickString(record, ["id", "stepId", "step_id"])
        : null
      const createdPosition = record ? parsePosition(record.position) : null
      const createdName = record
        ? pickString(record, ["name", "stepName", "step_name"])
        : null
      const createdMethod = record ? pickString(record, ["method"]) : null
      const createdUrl = record ? pickString(record, ["url", "path"]) : null
      const indexRaw =
        record &&
        (typeof record.index === "string" || typeof record.index === "number")
          ? String(record.index)
          : undefined

      if (createdId) {
        setSteps((current) =>
          current.map((step) =>
            step.id === tempId
              ? ({
                  ...step,
                  id: createdId,
                  ...(indexRaw ? { index: indexRaw } : {}),
                  name: createdName ?? step.name,
                  method: createdMethod ?? step.method,
                  path: createdUrl ?? step.path,
                  headers: record
                    ? parseStringRecord(record.headers)
                    : step.headers,
                  query: record ? parseStringRecord(record.query) : step.query,
                  body: record?.body ?? step.body,
                  timeout: record
                    ? pickNumber(
                        record,
                        ["timeout", "timeoutMs", "timeout_ms"],
                        step.timeout
                      )
                    : step.timeout,
                  retryOnFailure: record
                    ? pickBoolean(
                        record,
                        ["retryOnFailure", "retry_on_failure"],
                        step.retryOnFailure
                      )
                    : step.retryOnFailure,
                  retryCount: record
                    ? pickNumber(
                        record,
                        ["retryCount", "retry_count"],
                        step.retryCount
                      )
                    : step.retryCount,
                  retryDelay: record
                    ? pickNumber(
                        record,
                        ["retryDelay", "retryDelayMs", "retry_delay_ms"],
                        step.retryDelay
                      )
                    : step.retryDelay,
                  x: createdPosition?.x ?? step.x,
                  y: createdPosition?.y ?? step.y,
                } as CanvasStep)
              : step
          )
        )
      }
    } catch (creationError) {
      setSteps((current) => current.filter((step) => step.id !== tempId))
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
    }
  }

  const handleCreateConnection = async (input: {
    sourceStepId: string
    targetStepId: string
  }) => {
    try {
      const created = await createWorkflowConnection(workflowId, input)
      return created
    } catch (saveError) {
      throw saveError
    }
  }

  const handleDeleteConnection = async (connectionId: string) => {
    const previousConnections = connections
    setConnections((current) =>
      current.filter((connection) => connection.id !== connectionId)
    )

    try {
      await deleteWorkflowConnection(workflowId, connectionId)
    } catch (deleteError) {
      setConnections(previousConnections)
      throw deleteError
    }
  }

  const handleEditStep = (step: CanvasStep) => {
    setSelectedStep(step)
    setIsStepDrawerOpen(true)
  }

  const handleUpdateStep = async (input: UpdateWorkflowStepInput) => {
    if (!selectedStep) return

    try {
      await updateWorkflowStep(workflowId, selectedStep.id, input)
    } catch (updateError) {
      throw updateError
    }
  }

  const handleDeleteStep = async (stepId: string) => {
    const previousSteps = steps
    const previousConnections = connections
    const wasEditing = selectedStep?.id === stepId

    setSteps((current) => current.filter((step) => step.id !== stepId))
    setConnections((current) =>
      current.filter(
        (connection) =>
          connection.sourceStepId !== stepId &&
          connection.targetStepId !== stepId
      )
    )
    if (wasEditing) {
      setIsStepDrawerOpen(false)
      setSelectedStep(null)
    }

    try {
      await deleteWorkflowStep(workflowId, stepId)
    } catch (deleteError) {
      setSteps(previousSteps)
      setConnections(previousConnections)
      if (wasEditing) {
        const restored = previousSteps.find((step) => step.id === stepId)
        if (restored) {
          setSelectedStep(restored)
          setIsStepDrawerOpen(true)
        }
      }
      throw deleteError
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeftIcon className="size-4" />
              Workflows
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-sm font-semibold">{workflow.name}</h1>
              <span className="rounded-md border px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                {workflow.status}
              </span>
              <div
                role="tablist"
                aria-label="Workflow views"
                className="flex items-center rounded-md border p-0.5"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "canvas"}
                  onClick={() => setActiveTab("canvas")}
                  className={cn(
                    "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                    activeTab === "canvas"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Canvas
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "runs"}
                  onClick={() => setActiveTab("runs")}
                  className={cn(
                    "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                    activeTab === "runs"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Runs
                </button>
              </div>
            </div>
          </div>
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

      <div
        className={cn(
          "flex min-h-0 flex-1 overflow-hidden",
          activeTab !== "canvas" && "hidden"
        )}
      >
        <aside className="flex w-72 shrink-0 flex-col border-r bg-background">
          <div className="shrink-0 space-y-1 border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Endpoints</h2>
            <p className="text-xs text-muted-foreground">
              Drag onto the canvas to add a step.
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {isEndpointsLoading && endpoints.members.length === 0 ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : endpoints.members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No endpoints available.
              </p>
            ) : (
              <ul className="space-y-2">
                {endpoints.members.map((endpoint) => (
                  <li key={endpoint.id}>
                    <button
                      type="button"
                      draggable
                      onClick={() => {
                        setSelectedEndpoint(endpoint)
                        setIsEndpointDrawerOpen(true)
                      }}
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
          </div>
        </aside>

        <div className="min-h-0 min-w-0 flex-1">
          <WorkflowCanvas
            workflowId={workflowId}
            steps={steps}
            connections={connections}
            onCreateStep={handleCreateStep}
            onMoveStep={handleMoveStep}
            onCreateConnection={handleCreateConnection}
            onDeleteConnection={handleDeleteConnection}
            onEditStep={handleEditStep}
            onDeleteStep={handleDeleteStep}
          />
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          activeTab !== "runs" && "hidden"
        )}
      >
        <WorkflowRunsPanel workflowId={workflowId} />
      </div>

      <StepDrawer
        workflowId={workflowId}
        step={selectedStep}
        variables={variables}
        onVariablesChange={setVariables}
        isOpen={isStepDrawerOpen}
        onOpenChange={(open) => {
          setIsStepDrawerOpen(open)
          if (!open) setSelectedStep(null)
        }}
        onSave={handleUpdateStep}
        onDelete={handleDeleteStep}
      />

      <EndpointDrawer
        endpoint={selectedEndpoint}
        isOpen={isEndpointDrawerOpen}
        onOpenChange={(open) => {
          setIsEndpointDrawerOpen(open)
          if (!open) setSelectedEndpoint(null)
        }}
        onSaved={(endpoint) => setSelectedEndpoint(endpoint)}
        onDeleted={() => {
          setIsEndpointDrawerOpen(false)
          setSelectedEndpoint(null)
        }}
      />

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
