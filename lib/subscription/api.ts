import type {
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  Subscription,
  SubscriptionPreview,
} from "./types"

export async function getSubscription(): Promise<Subscription | null> {
  const response = await fetch("/api/subscription", {
    method: "GET",
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error("Failed to fetch subscription")
  }

  return response.json()
}

export async function previewSubscription(
  planId: string
): Promise<SubscriptionPreview> {
  const response = await fetch("/api/subscriptions/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId }),
  })

  if (!response.ok) {
    throw new Error("Failed to preview subscription")
  }

  return response.json()
}

export async function createSubscription(
  input: CreateSubscriptionRequest
): Promise<CreateSubscriptionResponse> {
  const response = await fetch("/api/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Failed to create subscription")
  }

  return response.json()
}

export async function createBillingPortalSession(): Promise<CreateSubscriptionResponse> {
  const response = await fetch("/api/subscriptions/portal", {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to create billing portal session")
  }

  return response.json()
}
