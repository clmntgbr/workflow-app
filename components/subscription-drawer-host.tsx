"use client"

import { SubscriptionDrawer } from "@/components/subscription-drawer"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export const OPEN_SUBSCRIPTION_DRAWER_EVENT = "subscription:open"

export function SubscriptionDrawerHost() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_SUBSCRIPTION_DRAWER_EVENT, onOpen)
    return () => {
      window.removeEventListener(OPEN_SUBSCRIPTION_DRAWER_EVENT, onOpen)
    }
  }, [])

  return (
    <SubscriptionDrawer
      open={open}
      onOpenChange={setOpen}
      onGoPricing={() => {
        setOpen(false)
        router.push("/pricing")
      }}
    />
  )
}

export function openSubscriptionDrawer() {
  window.dispatchEvent(new Event(OPEN_SUBSCRIPTION_DRAWER_EVENT))
}
