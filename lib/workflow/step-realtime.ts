type StepRefetchListener = () => void

const listenersByWorkflowId = new Map<string, Set<StepRefetchListener>>()

export function subscribeWorkflowStepsRefetch(
  workflowId: string,
  listener: StepRefetchListener
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

export function notifyWorkflowStepsRefetch(workflowId?: string): void {
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
