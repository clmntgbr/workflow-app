type ConnectionRefetchListener = () => void

const listenersByWorkflowId = new Map<string, Set<ConnectionRefetchListener>>()

export function subscribeWorkflowConnectionsRefetch(
  workflowId: string,
  listener: ConnectionRefetchListener
): () => void {
  const listeners = listenersByWorkflowId.get(workflowId) ?? new Set()
  listeners.add(listener)
  listenersByWorkflowId.set(workflowId, listeners)

  return () => {
    const current = listenersByWorkflowId.get(workflowId)
    if (!current) return
    current.delete(listener)
    if (current.size === 0) {
      listenersByWorkflowId.delete(workflowId)
    }
  }
}

export function notifyWorkflowConnectionsRefetch(workflowId?: string): void {
  if (workflowId) {
    const listeners = listenersByWorkflowId.get(workflowId)
    if (!listeners) return
    for (const listener of listeners) listener()
    return
  }

  for (const listeners of listenersByWorkflowId.values()) {
    for (const listener of listeners) listener()
  }
}
