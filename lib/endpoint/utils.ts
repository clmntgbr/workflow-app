export interface KeyValuePair {
  key: string
  value: string
}

export function recordToKeyValuePairs(
  record: Record<string, string> | undefined | null
): KeyValuePair[] {
  if (!record) return []
  return Object.entries(record).map(([key, value]) => ({ key, value }))
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

export function millisecondsToSeconds(ms: number): number {
  if (!Number.isFinite(ms)) return 0
  return Math.round(ms / 1000)
}

export function secondsToMilliseconds(seconds: number): number {
  return seconds * 1000
}
