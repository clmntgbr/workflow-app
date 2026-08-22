"use client"

import { PaymentCancel } from "@/components/payment-cancel"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function SubscriptionCancelContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason =
    searchParams.get("reason") === "declined" ? "declined" : "cancelled"

  return (
    <PaymentCancel reason={reason} onGoHome={() => router.push("/pricing")} />
  )
}

export default function SubscriptionCancelPage() {
  return (
    <div className="h-full overflow-auto">
      <Suspense fallback={null}>
        <SubscriptionCancelContent />
      </Suspense>
    </div>
  )
}
