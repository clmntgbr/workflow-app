import { Plan } from "./types"

export async function listPlans(): Promise<Plan[]> {
  const response = await fetch("/api/plans", {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to list plans")
  }

  const data = await response.json()
  return Array.isArray(data) ? data : []
}
