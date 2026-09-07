import type { UserStreamEvent } from "@/lib/centrifugo/types"

type RunExportListener = (event: UserStreamEvent) => void

const listeners = new Set<RunExportListener>()

export function subscribeRunExportUpdate(listener: RunExportListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifyRunExportUpdate(event: UserStreamEvent): void {
  for (const listener of listeners) listener(event)
}
