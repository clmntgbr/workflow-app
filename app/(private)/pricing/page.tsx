"use client"

import { Pricing } from "@/components/pricing"
import { getBasePlanSlug } from "@/lib/plan/pricing"
import { useOptionalSubscription } from "@/lib/subscription/context"

export default function PricingPage() {
  const subscriptionContext = useOptionalSubscription()

  const currentPlanSlug = subscriptionContext?.subscription?.plan?.slug
    ? getBasePlanSlug(subscriptionContext.subscription.plan.slug)
    : null

  return (
    <div className="h-full overflow-auto">
      <Pricing currentPlanSlug={currentPlanSlug} />
    </div>
  )
}
