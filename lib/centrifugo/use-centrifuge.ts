"use client"

import { Centrifuge } from "centrifuge"
import { useEffect, useRef } from "react"
import { getRealtimeConnection } from "./api"

/**
 * Connects to Centrifugo using GET /api/realtime/connection
 * (`token`, `channel` = users:<uuid>, `wsUrl`), then subscribes to `channel`.
 * No-ops quietly when realtime is unavailable.
 */
export function useCentrifuge(
  enabled: boolean,
  onPublication: (data: unknown) => void
) {
  const onPublicationRef = useRef(onPublication)

  useEffect(() => {
    onPublicationRef.current = onPublication
  }, [onPublication])

  useEffect(() => {
    if (!enabled) return

    let centrifuge: Centrifuge | null = null
    let cancelled = false

    const connect = async () => {
      const connection = await getRealtimeConnection()
      if (cancelled || !connection) return

      centrifuge = new Centrifuge(connection.wsUrl, {
        getToken: async () => {
          const next = await getRealtimeConnection()
          if (!next?.token) {
            throw new Error("Realtime token refresh failed")
          }
          return next.token
        },
      })

      const subscription = centrifuge.newSubscription(connection.channel)

      subscription.on("publication", (ctx) => {
        onPublicationRef.current(ctx.data)
      })

      subscription.on("error", (ctx) => {
        console.warn("[Centrifugo] subscription error", connection.channel, ctx)
      })

      centrifuge.on("disconnected", (ctx) => {
        console.warn("[Centrifugo] disconnected", ctx)
      })

      subscription.subscribe()
      centrifuge.connect()
    }

    void connect()

    return () => {
      cancelled = true
      centrifuge?.disconnect()
    }
  }, [enabled])
}
