"use client"

import { useOptionalSubscription } from "@/lib/subscription/context"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"

const REDIRECT_DELAY_MS = 10000

interface PaymentSuccessProps {
  onGoHome: () => void
}

export function PaymentSuccess({ onGoHome }: PaymentSuccessProps) {
  const subscriptionContext = useOptionalSubscription()
  const resetPaymentSucceeded = subscriptionContext?.resetPaymentSucceeded

  useEffect(() => {
    const timeout = setTimeout(onGoHome, REDIRECT_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [onGoHome])

  useEffect(() => {
    return () => {
      resetPaymentSucceeded?.()
    }
  }, [resetPaymentSucceeded])

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="relative flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Loader2 className="size-9 animate-spin" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Verifying payment…
        </h1>
        <p className="text-muted-foreground">
          We are confirming your transaction. Your subscription will be
          activated automatically.
        </p>
        <p className="text-xs text-muted-foreground">
          Redirecting automatically in a few seconds…
        </p>
      </div>
    </div>
  )
}
