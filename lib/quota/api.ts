import type { QuotaUsage } from "./types"

export async function getQuota(): Promise<QuotaUsage> {
  const response = await fetch("/api/quota", {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch quota")
  }

  return response.json()
}
