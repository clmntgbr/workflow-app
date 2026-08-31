"use client"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Title } from "@/components/title"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ConditionStepDrawer } from "@/components/workflow/condition-step-drawer"
import { DelayStepModal } from "@/components/workflow/delay-step-modal"
import { StepDrawer } from "@/components/workflow/step-drawer"
import {
  CanvasStep,
  isConditionStep,
  isDelayStep,
} from "@/components/workflow/step-node"
import { VariableUsageDrawer } from "@/components/workflow/variable-usage-drawer"
import { WorkflowActivityDrawer } from "@/components/workflow/workflow-activity-drawer"
import { WorkflowAnalytics } from "@/components/workflow/workflow-analytics"
import {
  EndpointDragPayload,
  WorkflowCanvas,
} from "@/components/workflow/workflow-canvas"
import { WorkflowDrawer } from "@/components/workflow/workflow-drawer"
import { WorkflowNotFoundView } from "@/components/workflow/workflow-not-found-view"
import { WorkflowRunsPanel } from "@/components/workflow/workflow-runs-panel"
import { WorkflowVariablesDrawer } from "@/components/workflow/workflow-variables-drawer"
import { useEndpoint } from "@/lib/endpoint/context"
import { Endpoint } from "@/lib/endpoint/types"
import { parseQueryRecord } from "@/lib/endpoint/utils"
import { useProject } from "@/lib/project/context"
import { cn } from "@/lib/utils"
import {
  getActiveWorkflowRun,
  startWorkflowRun,
  stopWorkflowRun,
  WorkflowRunConflictError,
} from "@/lib/workflow-run/api"
import { subscribeWorkflowRunsRefetch } from "@/lib/workflow-run/run-realtime"
import { parseRunStatus, WorkflowRun } from "@/lib/workflow-run/types"
import {
  activateWorkflow,
  createWorkflowConnection,
  createWorkflowStep,
  deactivateWorkflow,
  deleteWorkflowConnection,
  deleteWorkflowStep,
  getWorkflow,
  getWorkflowConnections,
  getWorkflowStep,
  getWorkflowSteps,
  updateConditionWorkflowStep,
  updateDelayWorkflowStep,
  updateStepPosition,
  updateWorkflowStep,
  WorkflowNotFoundError,
} from "@/lib/workflow/api"
import { subscribeWorkflowConnectionsRefetch } from "@/lib/workflow/connection-realtime"
import { subscribeWorkflowStepsRefetch } from "@/lib/workflow/step-realtime"
import {
  DEFAULT_CONDITION_EXPRESSION,
  parseConditionBranch,
} from "@/lib/workflow/condition"
import { DEFAULT_DELAY_DURATION_SECONDS } from "@/lib/workflow/delay"
import { inferStepType, isValidStepEndpointId } from "@/lib/workflow/step-validation"
import {
  UpdateWorkflowStepInput,
  Workflow,
  WorkflowConnection,
  ConditionBranch,
} from "@/lib/workflow/types"
import {
  deleteWorkflowVariable,
  listWorkflowVariables,
} from "@/lib/workflow/variable/api"
import {
  VariableInUseError,
  VariableUsageStep,
  WorkflowVariable,
} from "@/lib/workflow/variable/types"
import { subscribeWorkflowVariablesRefetch } from "@/lib/workflow/variable/variable-realtime"
import { subscribeWorkflowDetailRefetch } from "@/lib/workflow/workflow-realtime"
import {
  ArrowLeftIcon,
  BracesIcon,
  CirclePlayIcon,
  CircleStopIcon,
  HistoryIcon,
  LayersIcon,
  Loader2Icon,
  ScrollTextIcon,
  SettingsIcon,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

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

function unwrapStepPayload(payload: unknown): unknown {
  const record = asRecord(payload)
  if (!record) return payload
  const nested = asRecord(record.data)
  if (nested && (nested.id || nested.stepId || nested.step_id)) {
    return nested
  }
  return payload
}

function mapItemToCanvasStep(
  item: unknown,
  endpointById: Map<string, Endpoint>,
  fallback?: Pick<CanvasStep, "x" | "y">
): CanvasStep | null {
  const record = asRecord(unwrapStepPayload(item))
  if (!record) return null

  const id = pickString(record, ["id", "stepId", "step_id"])
  const stepType = inferStepType(record)
  const endpointIdRaw = record.endpointId ?? record.endpoint_id
  const endpointId = isValidStepEndpointId(endpointIdRaw) ? String(endpointIdRaw).trim() : null
  const delayDurationSeconds = pickNumber(
    record,
    ["delayDurationSeconds", "delay_duration_seconds"],
    0
  )
  const stepName = pickString(record, ["name", "stepName", "step_name"])
  const url = pickString(record, ["url", "path"])
  const method = pickString(record, ["method"])
  const indexRaw =
    typeof record.index === "string" || typeof record.index === "number"
      ? String(record.index)
      : undefined
  const position =
    parsePosition(record.position) ??
    (fallback ? { x: fallback.x, y: fallback.y } : null)

  if (!id || !position) return null

  if (stepType === "delay") {
    return {
      id,
      type: "delay",
      ...(indexRaw ? { index: indexRaw } : {}),
      name: stepName ?? "Delay",
      description:
        typeof record.description === "string"
          ? record.description
          : record.description === null
            ? null
            : null,
      endpointId: null,
      delayDurationSeconds: delayDurationSeconds > 0 ? delayDurationSeconds : null,
      expression: null,
      method: "",
      path: "",
      headers: {},
      query: {},
      body: {},
      timeout: 0,
      retryOnFailure: false,
      retryCount: 0,
      retryDelay: 0,
      executionOrder: pickNumber(record, ["executionOrder", "execution_order"]),
      treeIndex: pickNumber(record, ["treeIndex", "tree_index"]),
      status: pickString(record, ["status"]) ?? undefined,
      lastRunStatus: parseRunStatus(
        record.lastRunStatus ?? record.last_run_status
      ),
      x: position.x,
      y: position.y,
    }
  }

  if (stepType === "condition") {
    const expression = pickString(record, ["expression"])
    return {
      id,
      type: "condition",
      ...(indexRaw ? { index: indexRaw } : {}),
      name: stepName ?? "Condition",
      description:
        typeof record.description === "string"
          ? record.description
          : record.description === null
            ? null
            : null,
      endpointId: null,
      delayDurationSeconds: null,
      expression: expression ?? null,
      method: "",
      path: "",
      headers: {},
      query: {},
      body: {},
      timeout: 0,
      retryOnFailure: false,
      retryCount: 0,
      retryDelay: 0,
      executionOrder: pickNumber(record, ["executionOrder", "execution_order"]),
      treeIndex: pickNumber(record, ["treeIndex", "tree_index"]),
      status: pickString(record, ["status"]) ?? undefined,
      lastRunStatus: parseRunStatus(
        record.lastRunStatus ?? record.last_run_status
      ),
      x: position.x,
      y: position.y,
    }
  }

  if (!endpointId) return null

  const nestedEndpoint = asRecord(record.endpoint)
  const endpoint =
    (nestedEndpoint?.id && typeof nestedEndpoint.id === "string"
      ? (nestedEndpoint as unknown as Endpoint)
      : undefined) ?? endpointById.get(endpointId)

  const descriptionValue = record.description
  const description =
    typeof descriptionValue === "string"
      ? descriptionValue
      : descriptionValue === null
        ? null
        : (endpoint?.description ?? null)

  return {
    id,
    type: "http",
    ...(indexRaw ? { index: indexRaw } : {}),
    name: stepName ?? endpoint?.name ?? endpointId,
    description,
    endpointId,
    delayDurationSeconds: null,
    expression: null,
    method: method ?? endpoint?.method ?? "GET",
    path: url ?? endpoint?.url ?? "/",
    headers: parseStringRecord(record.headers),
    query: parseQueryRecord(record.query),
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
      endpoint?.retryDelay ?? 10000
    ),
    executionOrder: pickNumber(record, ["executionOrder", "execution_order"]),
    treeIndex: pickNumber(record, ["treeIndex", "tree_index"]),
    status: pickString(record, ["status"]) ?? undefined,
    lastRunStatus: parseRunStatus(
      record.lastRunStatus ?? record.last_run_status
    ),
    x: position.x,
    y: position.y,
    ...(endpoint ? { endpoint } : {}),
  }
}

export function WorkflowPageClient({ workflowId }: WorkflowPageClientProps) {
  const Tabs = [
    { label: "Overview", key: "overview", Icon: LayersIcon },
    { label: "Analytics", key: "analytics", Icon: HistoryIcon },
  ] as const

  type Tab = (typeof Tabs)[number]["key"]
  const [tab, setTab] = useState<Tab>("overview")

  const router = useRouter()
  const { activeProject } = useProject()
  const { endpoints } = useEndpoint()

  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isVariablesDrawerOpen, setIsVariablesDrawerOpen] = useState(false)
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false)
  const [selectedStep, setSelectedStep] = useState<CanvasStep | null>(null)
  const [isStepDrawerOpen, setIsStepDrawerOpen] = useState(false)
  const [selectedDelayStep, setSelectedDelayStep] = useState<CanvasStep | null>(
    null
  )
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false)
  const [selectedConditionStep, setSelectedConditionStep] =
    useState<CanvasStep | null>(null)
  const [isConditionDrawerOpen, setIsConditionDrawerOpen] = useState(false)
  const [steps, setSteps] = useState<CanvasStep[]>([])
  const [connections, setConnections] = useState<WorkflowConnection[]>([])
  const [variables, setVariables] = useState<WorkflowVariable[]>([])
  const [variableToDelete, setVariableToDelete] =
    useState<WorkflowVariable | null>(null)
  const [isDeleteVariableOpen, setIsDeleteVariableOpen] = useState(false)
  const [isUsageDrawerOpen, setIsUsageDrawerOpen] = useState(false)
  const [usageSteps, setUsageSteps] = useState<VariableUsageStep[]>([])
  const [activeTab, setActiveTab] = useState<WorkflowPageTab>("canvas")
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const [activeRun, setActiveRun] = useState<WorkflowRun | null>(null)
  const [isRunActionLoading, setIsRunActionLoading] = useState(false)

  const endpointById = new Map(
    endpoints.members.map((endpoint) => [endpoint.id, endpoint])
  )

  const loadSteps = useCallback(async () => {
    const payload = await getWorkflowSteps(workflowId)
    const nextSteps = listFromPayload(payload)
      .map((item) => mapItemToCanvasStep(item, endpointById))
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

        const branch = parseConditionBranch(record.branch)
        const normalizedBranch = branch === undefined ? null : branch

        return {
          id,
          sourceStepId,
          targetStepId,
          branch: normalizedBranch,
        } satisfies WorkflowConnection
      })
      .filter((value): value is WorkflowConnection => value !== null)

    setConnections(nextConnections)
  }, [workflowId])

  const loadVariables = useCallback(async () => {
    const next = await listWorkflowVariables(workflowId)
    setVariables(next)
  }, [workflowId])

  useEffect(() => {
    if (!activeProject?.id) return

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
  }, [workflowId, activeProject?.id])

  useEffect(() => {
    if (!activeProject?.id) return

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
  }, [activeProject?.id, loadSteps, loadConnections, loadVariables])

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

  useEffect(() => {
    return subscribeWorkflowVariablesRefetch(workflowId, () => {
      void loadVariables()
    })
  }, [workflowId, loadVariables])

  useEffect(() => {
    return subscribeWorkflowDetailRefetch(workflowId, () => {
      void getWorkflow(workflowId)
        .then((next) => setWorkflow(next))
        .catch(() => {})
    })
  }, [workflowId])

  const refreshActiveRun = useCallback(async () => {
    try {
      const run = await getActiveWorkflowRun(workflowId)
      setActiveRun(run)
    } catch {
      // Keep current run state on transient errors.
    }
  }, [workflowId])

  useEffect(() => {
    void refreshActiveRun()
  }, [refreshActiveRun])

  useEffect(() => {
    return subscribeWorkflowRunsRefetch(workflowId, () => {
      void refreshActiveRun()
    })
  }, [workflowId, refreshActiveRun])

  const handleStartRun = async () => {
    if (isRunActionLoading || activeRun) return

    setIsRunActionLoading(true)
    try {
      const run = await startWorkflowRun(workflowId)
      setActiveRun(run)
    } catch (error) {
      if (
        error instanceof WorkflowRunConflictError &&
        error.code === "RUN_IN_PROGRESS"
      ) {
        await refreshActiveRun()
        return
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to start workflow run"
      )
    } finally {
      setIsRunActionLoading(false)
    }
  }

  const handleStopRun = async () => {
    if (isRunActionLoading || !activeRun) return

    setIsRunActionLoading(true)
    try {
      await stopWorkflowRun(workflowId)
      setActiveRun(null)
    } catch (error) {
      if (
        error instanceof WorkflowRunConflictError &&
        error.code === "NO_RUN_IN_PROGRESS"
      ) {
        setActiveRun(null)
        return
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to stop workflow run"
      )
    } finally {
      setIsRunActionLoading(false)
    }
  }

  const handleStatusToggle = async (nextActive: boolean) => {
    if (!workflow || isTogglingStatus) return

    const previous = workflow
    setIsTogglingStatus(true)
    setWorkflow({
      ...workflow,
      status: nextActive ? "active" : "inactive",
      ...(nextActive ? {} : { nextRunAt: null }),
    })

    try {
      const updated = nextActive
        ? await activateWorkflow(workflowId)
        : await deactivateWorkflow(workflowId)
      setWorkflow(updated)
    } catch {
      setWorkflow(previous)
    } finally {
      setIsTogglingStatus(false)
    }
  }

  if (!activeProject?.id || isLoading) {
    return (
      <div className="h-full space-y-4 overflow-auto p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-40 w-full" />
      </div>
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
      type: "http",
      name: input.preview.name || endpoint?.name || "Step",
      description: input.preview.description ?? endpoint?.description ?? null,
      endpointId: input.endpointId,
      delayDurationSeconds: null,
      expression: null,
      method: input.preview.method || endpoint?.method || "GET",
      path: input.preview.path || endpoint?.url || "/",
      headers: endpoint?.headers ?? {},
      query: endpoint?.query ?? {},
      body: endpoint?.body ?? {},
      timeout: endpoint?.timeout ?? 30000,
      retryOnFailure: endpoint?.retryOnFailure ?? false,
      retryCount: endpoint?.retryCount ?? 0,
      retryDelay: endpoint?.retryDelay ?? 10000,
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
                  query: record ? parseQueryRecord(record.query) : step.query,
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

  const handleCreateDelayStep = async (position: Point) => {
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticStep: CanvasStep = {
      id: tempId,
      type: "delay",
      name: "Delay",
      description: null,
      endpointId: null,
      delayDurationSeconds: DEFAULT_DELAY_DURATION_SECONDS,
      expression: null,
      method: "",
      path: "",
      headers: {},
      query: {},
      body: {},
      timeout: 0,
      retryOnFailure: false,
      retryCount: 0,
      retryDelay: 0,
      x: position.x,
      y: position.y,
    }

    setSteps((current) => [...current, optimisticStep])

    try {
      const created = await createWorkflowStep(workflowId, {
        type: "delay",
        delayDurationSeconds: DEFAULT_DELAY_DURATION_SECONDS,
        position,
        name: "Delay",
      })

      const mapped = mapItemToCanvasStep(created, endpointById, optimisticStep)
      if (mapped) {
        setSteps((current) =>
          current.map((step) => (step.id === tempId ? mapped : step))
        )
      }
    } catch (creationError) {
      setSteps((current) => current.filter((step) => step.id !== tempId))
      throw creationError
    }
  }

  const handleCreateConditionStep = async (position: Point) => {
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticStep: CanvasStep = {
      id: tempId,
      type: "condition",
      name: "Condition",
      description: null,
      endpointId: null,
      delayDurationSeconds: null,
      expression: DEFAULT_CONDITION_EXPRESSION,
      method: "",
      path: "",
      headers: {},
      query: {},
      body: {},
      timeout: 0,
      retryOnFailure: false,
      retryCount: 0,
      retryDelay: 0,
      x: position.x,
      y: position.y,
    }

    setSteps((current) => [...current, optimisticStep])

    try {
      const created = await createWorkflowStep(workflowId, {
        type: "condition",
        expression: DEFAULT_CONDITION_EXPRESSION,
        position,
        name: "Condition",
      })

      const mapped = mapItemToCanvasStep(created, endpointById, optimisticStep)
      if (mapped) {
        setSteps((current) =>
          current.map((step) => (step.id === tempId ? mapped : step))
        )
      }
    } catch (creationError) {
      setSteps((current) => current.filter((step) => step.id !== tempId))
      throw creationError
    }
  }

  const handleSaveDelayStep = async (delayDurationSeconds: number) => {
    if (!selectedDelayStep || selectedDelayStep.id.startsWith("temp-")) {
      throw new Error("Delay step is not ready to save")
    }

    await updateDelayWorkflowStep(workflowId, selectedDelayStep.id, {
      name: selectedDelayStep.name,
      description: selectedDelayStep.description ?? "",
      delayDurationSeconds,
    })

    setSteps((current) =>
      current.map((step) =>
        step.id === selectedDelayStep.id
          ? { ...step, delayDurationSeconds }
          : step
      )
    )
  }

  const handleSaveConditionStep = async (input: {
    name: string
    description: string
    expression: string
  }) => {
    if (!selectedConditionStep || selectedConditionStep.id.startsWith("temp-")) {
      throw new Error("Condition step is not ready to save")
    }

    await updateConditionWorkflowStep(
      workflowId,
      selectedConditionStep.id,
      input
    )

    setSteps((current) =>
      current.map((step) =>
        step.id === selectedConditionStep.id
          ? {
              ...step,
              name: input.name,
              description: input.description || null,
              expression: input.expression,
            }
          : step
      )
    )
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
          step.id === stepId ? { ...step, x: previous.x, y: previous.y } : step
        )
      )
    }
  }

  const handleCreateConnection = async (input: {
    sourceStepId: string
    targetStepId: string
    branch?: ConditionBranch | null
  }) => {
    try {
      const created = await createWorkflowConnection(workflowId, input)
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
    if (isDelayStep(step)) {
      if (step.id.startsWith("temp-")) return

      setSelectedDelayStep(step)
      setIsDelayModalOpen(true)

      void getWorkflowStep(workflowId, step.id)
        .then((payload) => {
          const mapped = mapItemToCanvasStep(payload, endpointById, step)
          if (mapped) setSelectedDelayStep(mapped)
        })
        .catch(() => {})
      return
    }

    if (isConditionStep(step)) {
      if (step.id.startsWith("temp-")) return

      setSelectedConditionStep(step)
      setIsConditionDrawerOpen(true)

      void getWorkflowStep(workflowId, step.id)
        .then((payload) => {
          const mapped = mapItemToCanvasStep(payload, endpointById, step)
          if (mapped) setSelectedConditionStep(mapped)
        })
        .catch(() => {})
      return
    }

    setSelectedStep(step)
    setIsStepDrawerOpen(true)

    if (step.id.startsWith("temp-")) return

    void getWorkflowStep(workflowId, step.id)
      .then((payload) => {
        const mapped = mapItemToCanvasStep(payload, endpointById, step)
        if (mapped) setSelectedStep(mapped)
      })
      .catch(() => {})
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
    const deletedStep = steps.find((step) => step.id === stepId)
    const wasEditing = selectedStep?.id === stepId
    const wasEditingCondition = selectedConditionStep?.id === stepId
    const wasEditingDelay = selectedDelayStep?.id === stepId

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
    if (wasEditingCondition || deletedStep?.type === "condition") {
      setIsConditionDrawerOpen(false)
      setSelectedConditionStep(null)
    }
    if (wasEditingDelay || deletedStep?.type === "delay") {
      setIsDelayModalOpen(false)
      setSelectedDelayStep(null)
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
      <div className="relative flex shrink-0 items-center justify-between gap-4 border-b bg-background px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeftIcon className="size-4" />
              Workflows
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-display truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                    {workflow.name}
                  </h1>
                </div>
                <p className="mt-0.75 truncate text-[11.5px] leading-none text-muted-foreground">
                  {steps.length} steps
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-elevated/60 absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-full border border-border/80 p-0.75">
          {Tabs.map(({ label, Icon: IconComponent, key }) => {
            const active = key === tab
            return (
              <div key={label} className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTab(key)}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  title={label}
                  className={
                    "flex h-8 cursor-pointer items-center gap-1.5 rounded-full transition-all duration-200" +
                    (active
                      ? "shadow-crisp border border-accent/35 bg-gray-100 px-3.5 font-medium"
                      : "bg-white px-3 text-muted-foreground hover:bg-white hover:text-foreground")
                  }
                >
                  <IconComponent className="size-3.75 shrink-0" />
                  {active && <span className="text-[13px]">{label}</span>}
                </Button>
              </div>
            )
          })}
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsActivityDrawerOpen(true)}
              aria-label="Activity"
              title="Activity"
              className={
                "flex h-8 cursor-pointer items-center gap-1.5 rounded-full transition-all duration-200" +
                (isActivityDrawerOpen
                  ? "shadow-crisp border border-accent/35 bg-gray-100 px-3.5 font-medium"
                  : "bg-white px-3 text-muted-foreground hover:bg-white hover:text-foreground")
              }
            >
              <ScrollTextIcon className="size-3.75 shrink-0" />
              {isActivityDrawerOpen && (
                <span className="text-[13px]">Activity</span>
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {workflow.status === "active" ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={isRunActionLoading}
              onClick={activeRun ? handleStopRun : handleStartRun}
              className={cn(
                "cursor-pointer gap-2 px-4 font-semibold shadow-sm focus:ring-2 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70",
                activeRun
                  ? "bg-rose-600 text-white hover:bg-rose-700 hover:text-white focus:ring-rose-300"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white focus:ring-emerald-300"
              )}
            >
              {isRunActionLoading ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : activeRun ? (
                <CircleStopIcon className="size-3.5" />
              ) : (
                <CirclePlayIcon className="size-3.5" />
              )}
              {activeRun ? "Stop" : "Start"}
            </Button>
          ) : null}
          <Button
            size="lg"
            onClick={() => handleStatusToggle(workflow.status !== "active")}
            className={cn(
              "group cursor-pointer gap-2.5 px-3.5 transition-all duration-300 ease-out active:translate-y-0 active:scale-[0.98]",
              workflow.status === "active"
                ? "border-green-700/25 bg-green-700/10 text-green-700 hover:border-green-700/45 hover:bg-green-700/20"
                : "border-red-700/25 bg-red-700/10 text-red-700 hover:border-red-700/45 hover:bg-red-700/20"
            )}
          >
            <span className="relative flex size-2">
              {workflow.status === "active" && (
                <span className="absolute inset-0 animate-ping rounded-full bg-green-500 opacity-60" />
              )}
              <span
                className={cn(
                  "relative size-2 rounded-full transition-colors duration-300",
                  workflow.status === "active" ? "bg-green-500" : "bg-red-500"
                )}
              />
            </span>
            <span className="text-xs font-medium">
              {workflow.status === "active" ? "Active" : "Inactive"}
            </span>
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => setIsVariablesDrawerOpen(true)}
            aria-label="Workflow variables"
          >
            <BracesIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Edit workflow"
          >
            <SettingsIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden",
          tab !== "overview" && "hidden"
        )}
      >
        <WorkflowCanvas
          workflowId={workflowId}
          steps={steps}
          connections={connections}
          onCreateStep={handleCreateStep}
          onCreateDelayStep={handleCreateDelayStep}
          onCreateConditionStep={handleCreateConditionStep}
          onMoveStep={handleMoveStep}
          onCreateConnection={handleCreateConnection}
          onDeleteConnection={handleDeleteConnection}
          onEditStep={handleEditStep}
          onDeleteStep={handleDeleteStep}
        />
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto bg-[#f8f9fb]",
          tab !== "analytics" && "hidden"
        )}
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto flex flex-col gap-6 pt-10">
            <div className="shrink-0 pb-4">
              <Title
                icon={<HistoryIcon className="size-5" />}
                title="Analytics"
                description="Workflow run history and performance"
              />
            </div>
            <WorkflowAnalytics workflowId={workflowId} />
            <WorkflowRunsPanel workflowId={workflowId} />
          </div>
        </div>
      </div>

      <DelayStepModal
        open={isDelayModalOpen}
        onOpenChange={(open) => {
          setIsDelayModalOpen(open)
          if (!open) setSelectedDelayStep(null)
        }}
        step={selectedDelayStep}
        onSave={handleSaveDelayStep}
      />

      <ConditionStepDrawer
        workflowId={workflowId}
        isOpen={isConditionDrawerOpen}
        onOpenChange={(open) => {
          setIsConditionDrawerOpen(open)
          if (!open) setSelectedConditionStep(null)
        }}
        step={selectedConditionStep}
        onSave={handleSaveConditionStep}
        onDelete={handleDeleteStep}
      />

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
        onRequestDeleteVariable={(variable) => {
          setVariableToDelete(variable)
          setIsDeleteVariableOpen(true)
        }}
      />

      <WorkflowDrawer
        workflow={workflow}
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onSaved={setWorkflow}
        onDeleted={() => router.push("/")}
      />

      <WorkflowVariablesDrawer
        workflowId={workflowId}
        variables={variables}
        steps={steps}
        isOpen={isVariablesDrawerOpen}
        onOpenChange={setIsVariablesDrawerOpen}
        onVariablesChange={setVariables}
        onRequestDelete={(variable) => {
          setVariableToDelete(variable)
          setIsDeleteVariableOpen(true)
        }}
      />

      <WorkflowActivityDrawer
        workflowId={workflowId}
        isOpen={isActivityDrawerOpen}
        onOpenChange={setIsActivityDrawerOpen}
      />

      <DeleteConfirmDialog
        open={isDeleteVariableOpen}
        onOpenChange={setIsDeleteVariableOpen}
        title="Delete variable"
        description={`Delete "${variableToDelete?.name ?? "this variable"}"? References to this variable in other steps will break.`}
        onConfirm={async () => {
          if (!variableToDelete) return
          await deleteWorkflowVariable(workflowId, variableToDelete.id)
        }}
        onDeleted={() => {
          if (!variableToDelete) return
          setVariables((current) =>
            current.filter((variable) => variable.id !== variableToDelete.id)
          )
        }}
        onBlocked={(error) => {
          if (!(error instanceof VariableInUseError)) return false
          setUsageSteps(error.steps)
          setIsUsageDrawerOpen(true)
          return true
        }}
        className="z-80"
        overlayClassName="z-75"
      />

      <VariableUsageDrawer
        workflowId={workflowId}
        variable={variableToDelete}
        steps={usageSteps}
        isOpen={isUsageDrawerOpen}
        onOpenChange={setIsUsageDrawerOpen}
        onDeleted={(variableId) => {
          setVariables((current) =>
            current.filter((variable) => variable.id !== variableId)
          )
        }}
        onOpenStep={(usageStep) => {
          const canvasStep = steps.find((step) => step.id === usageStep.id)
          if (canvasStep) handleEditStep(canvasStep)
        }}
      />
    </div>
  )
}
