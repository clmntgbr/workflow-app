export type RealtimeResource =
  | "user"
  | "organization"
  | "workflow"
  | "endpoint"
  | "step"
  | "connection"

export type RealtimeVerb =
  | "created"
  | "updated"
  | "deleted"
  | "active_organization_changed"
  | "member_added"
  | "member_removed"

export type RealtimeEventType = `${RealtimeResource}.${RealtimeVerb}`

/** Centrifugo user-channel payload: `{resource}.{action}`. */
export interface UserStreamEvent {
  type: RealtimeEventType
  userId?: string
  organizationId?: string
  endpointId?: string
  workflowId?: string
  stepId?: string
  name?: string
  status?: string
}

const RESOURCES = new Set<string>([
  "user",
  "organization",
  "workflow",
  "endpoint",
  "step",
  "connection",
])

const VERBS = new Set<string>([
  "created",
  "updated",
  "deleted",
  "active_organization_changed",
  "member_added",
  "member_removed",
])

export function parseRealtimeType(
  type: string
): { resource: RealtimeResource; verb: RealtimeVerb } | null {
  const separatorIndex = type.indexOf(".")
  if (separatorIndex <= 0) return null

  const resource = type.slice(0, separatorIndex)
  const verb = type.slice(separatorIndex + 1)

  if (!RESOURCES.has(resource) || !VERBS.has(verb)) {
    return null
  }

  return {
    resource: resource as RealtimeResource,
    verb: verb as RealtimeVerb,
  }
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

/** Refetch org list only on activate + create. */
export function shouldRefetchOrganizations(event: UserStreamEvent): boolean {
  return (
    event.type === "user.active_organization_changed" ||
    event.type === "organization.created"
  )
}

/** Refetch workflows on CRUD events and when the active org changes. */
export function shouldRefetchWorkflows(event: UserStreamEvent): boolean {
  return (
    getEventResource(event) === "workflow" ||
    event.type === "user.active_organization_changed" ||
    event.type === "organization.created"
  )
}

export function shouldRefetchAllEndpoints(event: UserStreamEvent): boolean {
  return (
    event.type === "endpoint.created" ||
    event.type === "user.active_organization_changed" ||
    event.type === "organization.created"
  )
}

export function shouldRefetchSingleEndpoint(event: UserStreamEvent): boolean {
  return event.type === "endpoint.updated"
}

export function shouldRefetchSteps(event: UserStreamEvent): boolean {
  return (
    event.type === "step.created" ||
    event.type === "step.updated" ||
    event.type === "step.deleted"
  )
}

export function shouldRefetchConnections(event: UserStreamEvent): boolean {
  return (
    event.type === "connection.created" ||
    event.type === "connection.deleted"
  )
}

/** Builds `users:{internalUserId}` — prefer `channel` from `/api/realtime/connection`. */
export function getUserChannel(userId: string): string {
  return `users:${userId}`
}
