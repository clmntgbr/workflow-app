type EndpointRefetchListener = () => void

const listeners = new Set<EndpointRefetchListener>()

export function subscribeEndpointsRefetch(
  listener: EndpointRefetchListener
): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function notifyEndpointsRefetch(): void {
  for (const listener of listeners) listener()
}
