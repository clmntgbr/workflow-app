"use client"

import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"

const REDIRECT_DELAY_MS = 10000

interface PaymentCancelProps {
  reason?: "cancelled" | "declined"
  onGoHome: () => void
}

export function PaymentCancel({
  reason = "cancelled",
  onGoHome,
}: PaymentCancelProps) {
  const isDeclined = reason === "declined"

  useEffect(() => {
    const timeout = setTimeout(onGoHome, REDIRECT_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [onGoHome])

  const styles = isDeclined
    ? {
        gradient: "var(--destructive)",
        circle: "bg-destructive text-white shadow-lg shadow-destructive/30",
        ping: "bg-destructive/20",
      }
    : {
        gradient: "#f59e0b",
        circle: "bg-amber-500 text-white shadow-lg shadow-amber-500/30",
        ping: "bg-amber-500/20",
      }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="relative">
        <div
          className={cn(
            "absolute inset-0 animate-ping rounded-full",
            styles.ping
          )}
        />
        <div
          className={cn(
            "relative flex size-20 items-center justify-center rounded-full",
            styles.circle
          )}
        >
          <Loader2 className="size-9 animate-spin" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {isDeclined ? "Payment declined" : "Payment canceled"}
        </h1>
        <p className="text-muted-foreground">
          {isDeclined
            ? "Your bank declined the payment."
            : "You canceled the payment. No amount was charged."}
        </p>
        <p className="text-xs text-muted-foreground">
          Redirecting automatically in a few seconds…
        </p>
      </div>
    </div>
  )
}
