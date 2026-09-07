export function hasNotificationTarget(values: {
  notifyOnSuccess: boolean
  notifyOnFailure: boolean
  notifyOnCancel: boolean
}): boolean {
  return (
    values.notifyOnSuccess || values.notifyOnFailure || values.notifyOnCancel
  )
}

const LEGACY_PAUSED_STATUSES = new Set(["inactive", "canceled", "cancelled"])

export function isWorkflowDeleted(status: string): boolean {
  return status === "deleted"
}

export function isWorkflowPaused(workflow: {
  status: string
  scheduleType: string
}): boolean {
  if (isWorkflowDeleted(workflow.status)) return false
  if (LEGACY_PAUSED_STATUSES.has(workflow.status)) return true
  return workflow.scheduleType === "none"
}

export type WorkflowDisplayStatus = "deleted" | "paused" | "active"

export function getWorkflowDisplayStatus(workflow: {
  status: string
  scheduleType: string
}): WorkflowDisplayStatus {
  if (isWorkflowDeleted(workflow.status)) return "deleted"
  if (isWorkflowPaused(workflow)) return "paused"
  return "active"
}

export function getWorkflowDisplayLabel(
  status: WorkflowDisplayStatus
): string {
  switch (status) {
    case "deleted":
      return "Deleted"
    case "paused":
      return "Paused"
    default:
      return "Active"
  }
}
