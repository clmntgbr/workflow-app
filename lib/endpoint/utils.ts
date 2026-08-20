export interface KeyValuePair {
  key: string
  value: string
}

/** Query params may be scalar or repeated (e.g. `groups[]=a&groups[]=b`). */
export type QueryParamValue = string | string[]
export type QueryRecord = Record<string, QueryParamValue>

export function splitUrlAndQuery(
  rawUrl: string
): { url: string; query: KeyValuePair[] } | null {
  const trimmed = rawUrl.trim()
  if (!trimmed || !trimmed.includes("?")) return null

  // Dynamic placeholders used by step URLs cannot be parsed by URL().
  if (trimmed.includes("{{") || trimmed.includes("}}")) return null

  try {
    const parsed = new URL(trimmed)
    const query: KeyValuePair[] = []

    // Preserve duplicate keys (URLSearchParams keeps insertion order).
    parsed.searchParams.forEach((value, key) => {
      query.push({ key, value })
    })

    parsed.search = ""
    return { url: parsed.toString(), query }
  } catch {
    return null
  }
}

export function recordToKeyValuePairs(
  record: Record<string, string | string[]> | undefined | null
): KeyValuePair[] {
  if (!record) return []

  const pairs: KeyValuePair[] = []
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        pairs.push({ key, value: entry })
      }
      continue
    }
    pairs.push({ key, value })
  }
  return pairs
}

export function keyValuePairsToRecord(
  pairs: KeyValuePair[]
): Record<string, string> {
  return pairs.reduce<Record<string, string>>((acc, pair) => {
    const key = pair.key.trim()
    if (!key) return acc
    acc[key] = pair.value
    return acc
  }, {})
}

/**
 * Convert form pairs to a query object that keeps repeated keys as arrays.
 * Example: groups[]=a&groups[]=b → { "groups[]": ["a", "b"] }
 */
export function keyValuePairsToQueryRecord(pairs: KeyValuePair[]): QueryRecord {
  const buckets = new Map<string, string[]>()

  for (const pair of pairs) {
    const key = pair.key.trim()
    if (!key) continue
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.push(pair.value)
    } else {
      buckets.set(key, [pair.value])
    }
  }

  const result: QueryRecord = {}
  for (const [key, values] of buckets) {
    result[key] = values.length === 1 ? values[0] : values
  }
  return result
}

export function parseQueryRecord(value: unknown): QueryRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}

  const result: QueryRecord = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") {
      result[key] = entry
      continue
    }
    if (Array.isArray(entry) && entry.every((item) => typeof item === "string")) {
      result[key] = entry.length === 1 ? entry[0] : entry
    }
  }
  return result
}

export function millisecondsToSeconds(ms: number): number {
  if (!Number.isFinite(ms)) return 0
  return Math.round(ms / 1000)
}

export function secondsToMilliseconds(seconds: number): number {
  return seconds * 1000
}
