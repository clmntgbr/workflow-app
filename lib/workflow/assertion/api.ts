import { Paginate, PaginateQuery } from "@/lib/paginate"
import {
  Assertion,
  CreateAssertionInput,
  UpdateAssertionInput,
} from "./types"

function buildQueryString(query?: PaginateQuery): string {
  if (!query) return ""

  const params = new URLSearchParams()
  if (query.page != null) params.set("page", String(query.page))
  if (query.limit != null) params.set("limit", String(query.limit))
  if (query.search) params.set("search", query.search)

  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function pickString(
  record: Record<string, unknown> | null,
  keys: string[]
): string | null {
  if (!record) return null
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string") return value
  }
  return null
}

function normalizeAssertion(raw: unknown): Assertion {
  const record = asRecord(raw)
  if (!record) {
    throw new Error("Invalid assertion payload")
  }

  const id = pickString(record, ["id"])
  const source = pickString(record, ["source"])
  const operator = pickString(record, ["operator"])
  const stepId = pickString(record, ["stepId", "step_id"])
  const workflowId = pickString(record, ["workflowId", "workflow_id"])
  const createdAt = pickString(record, ["createdAt", "created_at"])
  const updatedAt = pickString(record, ["updatedAt", "updated_at"])

  if (
    !id ||
    !source ||
    !operator ||
    !stepId ||
    !workflowId ||
    !createdAt ||
    !updatedAt
  ) {
    throw new Error("Invalid assertion payload")
  }

  const expectedValue = pickString(record, ["expectedValue", "expected_value"])

  return {
    id,
    description: pickString(record, ["description"]),
    source: source as Assertion["source"],
    path: pickString(record, ["path"]),
    operator: operator as Assertion["operator"],
    expectedValue,
    stepId,
    workflowId,
    createdAt,
    updatedAt,
  }
}

async function readErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data = await response.json()
    const record = asRecord(data)
    const nested = asRecord(record?.data)
    const message = nested?.message ?? record?.message
    if (typeof message === "string" && message.trim()) return message
  } catch {
    // ignore
  }
  return fallback
}

export async function listStepAssertions(
  workflowId: string,
  stepId: string
): Promise<Assertion[]> {
  const response = await fetch(
    `/api/workflows/${workflowId}/steps/${stepId}/assertions`,
    { method: "GET" }
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to list assertions")
    )
  }

  const data = await response.json()
  const items = Array.isArray(data)
    ? data
    : Array.isArray(asRecord(data)?.members)
      ? (asRecord(data)!.members as unknown[])
      : []

  return items.map(normalizeAssertion)
}

export async function listStepAssertionPaths(
  workflowId: string,
  stepId: string,
  query?: PaginateQuery
): Promise<Paginate<string>> {
  const response = await fetch(
    `/api/workflows/${workflowId}/steps/${stepId}/assertion-paths${buildQueryString(query)}`,
    { method: "GET" }
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to list assertion paths")
    )
  }

  return response.json()
}

export async function getAssertion(
  workflowId: string,
  assertionId: string
): Promise<Assertion> {
  const response = await fetch(
    `/api/workflows/${workflowId}/assertions/${assertionId}`,
    { method: "GET" }
  )

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to get assertion"))
  }

  return normalizeAssertion(await response.json())
}

function toBackendAssertionBody(
  input: CreateAssertionInput | UpdateAssertionInput
) {
  return {
    description: input.description,
    source: input.source,
    path: input.path,
    operator: input.operator,
    expectedValue: input.expectedValue ?? null,
  }
}

export async function createAssertion(
  workflowId: string,
  stepId: string,
  input: CreateAssertionInput
): Promise<Assertion> {
  const response = await fetch(
    `/api/workflows/${workflowId}/steps/${stepId}/assertions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toBackendAssertionBody(input)),
    }
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to create assertion")
    )
  }

  return normalizeAssertion(await response.json())
}

export async function updateAssertion(
  workflowId: string,
  assertionId: string,
  input: UpdateAssertionInput
): Promise<Assertion> {
  const response = await fetch(
    `/api/workflows/${workflowId}/assertions/${assertionId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toBackendAssertionBody(input)),
    }
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to update assertion")
    )
  }

  return normalizeAssertion(await response.json())
}

export async function deleteAssertion(
  workflowId: string,
  assertionId: string
): Promise<void> {
  const response = await fetch(
    `/api/workflows/${workflowId}/assertions/${assertionId}`,
    { method: "DELETE" }
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to delete assertion")
    )
  }
}
