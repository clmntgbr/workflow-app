export type RealtimeResource =
  | "user"
  | "project"
  | "workflow"
  | "endpoint"
  | "step"
  | "connection"
  | "workflowRun"
  | "stepRun"
  | "variable"
  | "subscription"
  | "payment"
  | "quota"

export type RealtimeVerb =
  | "created"
  | "updated"
  | "deleted"
  | "imported"
  | "active_project_changed"
  | "member_added"
  | "member_removed"
  | "started"
  | "finished"
  | "succeeded"
  | "failed"
  | "cancelled"

export type RealtimeEventType = `${RealtimeResource}.${RealtimeVerb}`

/** Centrifugo user-channel payload: `{resource}.{action}` (optional `.vN` suffix). */
export interface UserStreamEvent {
  type: string
  userId?: string
  projectId?: string
  endpointId?: string
  workflowId?: string
  workflowRunId?: string
  stepId?: string
  stepRunId?: string
  name?: string
  status?: string
}

const RESOURCES = new Set<string>([
  "user",
  "project",
  "workflow",
  "endpoint",
  "step",
  "connection",
  "workflowRun",
  "stepRun",
  "variable",
  "subscription",
  "payment",
  "quota",
])

const VERBS = new Set<string>([
  "created",
  "updated",
  "deleted",
  "imported",
  "active_project_changed",
  "member_added",
  "member_removed",
  "started",
  "finished",
  "succeeded",
  "failed",
  "cancelled",
])

/** Strips optional schema version suffix (`workflow.updated.v1` → `workflow.updated`). */
export function canonicalizeRealtimeType(type: string): string {
  return type.replace(/\.v\d+$/i, "")
}

export function parseRealtimeType(
  type: string
): { resource: RealtimeResource; verb: RealtimeVerb } | null {
  const normalized = canonicalizeRealtimeType(type)
  const separatorIndex = normalized.indexOf(".")
  if (separatorIndex <= 0) return null

  const resource = normalized.slice(0, separatorIndex)
  const verb = normalized.slice(separatorIndex + 1)

  if (!RESOURCES.has(resource) || !VERBS.has(verb)) {
    return null
  }

  return {
    resource: resource as RealtimeResource,
    verb: verb as RealtimeVerb,
  }
}

export function eventTypeEquals(
  event: UserStreamEvent,
  expected: RealtimeEventType
): boolean {
  return canonicalizeRealtimeType(event.type) === expected
}

export function isUserStreamEvent(value: unknown): value is UserStreamEvent {
  if (!value || typeof value !== "object") return false

  const type = (value as { type?: unknown }).type
  return typeof type === "string" && parseRealtimeType(type) !== null
}

export function getEventResource(event: UserStreamEvent): RealtimeResource {
  return parseRealtimeType(event.type)!.resource
}

export function isUserLifecycleEvent(event: UserStreamEvent): boolean {
  return getEventResource(event) === "user"
}

/** Refetch project list only on activate + create. */
export function shouldRefetchProjects(event: UserStreamEvent): boolean {
  return (
    eventTypeEquals(event, "user.active_project_changed") ||
    eventTypeEquals(event, "project.created")
  )
}

/** Refetch workflows on CRUD events and when the active project changes. */
export function shouldRefetchWorkflows(event: UserStreamEvent): boolean {
  return (
    getEventResource(event) === "workflow" ||
    eventTypeEquals(event, "user.active_project_changed") ||
    eventTypeEquals(event, "project.created")
  )
}

export function shouldRefetchWorkflowDetail(event: UserStreamEvent): boolean {
  return eventTypeEquals(event, "workflow.updated")
}

export function shouldRefetchAllEndpoints(event: UserStreamEvent): boolean {
  return (
    eventTypeEquals(event, "endpoint.created") ||
    eventTypeEquals(event, "endpoint.deleted") ||
    eventTypeEquals(event, "endpoint.imported") ||
    eventTypeEquals(event, "user.active_project_changed") ||
    eventTypeEquals(event, "project.created")
  )
}

export function shouldRefetchSingleEndpoint(event: UserStreamEvent): boolean {
  return eventTypeEquals(event, "endpoint.updated")
}

export function shouldRefetchSteps(event: UserStreamEvent): boolean {
  return (
    eventTypeEquals(event, "step.created") ||
    eventTypeEquals(event, "step.updated") ||
    eventTypeEquals(event, "step.deleted")
  )
}

/** Refresh canvas steps so `lastRunStatus` stays in sync after run completion. */
export function shouldRefetchStepsFromRunEvents(
  event: UserStreamEvent
): boolean {
  return (
    eventTypeEquals(event, "stepRun.succeeded") ||
    eventTypeEquals(event, "stepRun.failed") ||
    eventTypeEquals(event, "workflowRun.finished")
  )
}

export function shouldRefetchConnections(event: UserStreamEvent): boolean {
  return (
    eventTypeEquals(event, "connection.created") ||
    eventTypeEquals(event, "connection.deleted")
  )
}

export function shouldRefetchWorkflowRuns(event: UserStreamEvent): boolean {
  return (
    eventTypeEquals(event, "workflowRun.created") ||
    eventTypeEquals(event, "workflowRun.started") ||
    eventTypeEquals(event, "workflowRun.finished") ||
    eventTypeEquals(event, "stepRun.started") ||
    eventTypeEquals(event, "stepRun.succeeded") ||
    eventTypeEquals(event, "stepRun.failed")
  )
}

/** Refresh quota (and subscription) when a workflow run finishes. */
export function shouldRefetchQuotaFromWorkflowRunEvents(
  event: UserStreamEvent
): boolean {
  return eventTypeEquals(event, "workflowRun.finished")
}

export function shouldRefetchVariables(event: UserStreamEvent): boolean {
  return (
    eventTypeEquals(event, "variable.created") ||
    eventTypeEquals(event, "variable.updated")
  )
}

/** Builds `users:{internalUserId}` — prefer `channel` from `/api/realtime/connection`. */
export function getUserChannel(userId: string): string {
  return `users:${userId}`
}
