import {
  HeaderSuggestQuery,
  HeaderSuggestResponse,
  HeaderValueSuggestQuery,
  HeaderValueSuggestResponse,
} from "./types"

function buildQueryString(
  query?: HeaderSuggestQuery | HeaderValueSuggestQuery
): string {
  if (!query) return ""

  const params = new URLSearchParams()
  if (query.page != null) params.set("page", String(query.page))
  if (query.limit != null) params.set("limit", String(query.limit))
  if (query.search) params.set("search", query.search)

  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

async function readErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data = await response.json()
    const record = data && typeof data === "object" ? data : null
    const nested =
      record && typeof record.data === "object" ? record.data : record
    const message =
      nested && typeof nested.message === "string" ? nested.message : null
    return message || fallback
  } catch {
    return fallback
  }
}

export async function suggestHeaders(
  query?: HeaderSuggestQuery
): Promise<HeaderSuggestResponse> {
  const response = await fetch(
    `/api/headers/suggest${buildQueryString(query)}`,
    {
      method: "GET",
    }
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to fetch header suggestions")
    )
  }

  const result = await response.json()

  // Handle API response structure: { success: true, data: {...} }
  if (result.success && result.data) {
    return result.data
  }

  // Fallback if structure is different
  return result
}

export async function suggestHeaderValues(
  query?: HeaderValueSuggestQuery
): Promise<HeaderValueSuggestResponse> {
  const response = await fetch(
    `/api/headers/suggest-values${buildQueryString(query)}`,
    {
      method: "GET",
    }
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to fetch header value suggestions")
    )
  }

  const result = await response.json()

  // Handle API response structure: { success: true, data: {...} }
  if (result.success && result.data) {
    return result.data
  }

  // Fallback if structure is different
  return result
}
