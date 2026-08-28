export const DEFAULT_DELAY_DURATION_SECONDS = 60

export type DelayDurationUnit = "second" | "minute" | "hour"

export const DELAY_DURATION_UNITS: {
  value: DelayDurationUnit
  label: string
}[] = [
  { value: "second", label: "Seconds" },
  { value: "minute", label: "Minutes" },
  { value: "hour", label: "Hours" },
]

const UNIT_SECONDS: Record<DelayDurationUnit, number> = {
  second: 1,
  minute: 60,
  hour: 3600,
}

export function delayPartsToSeconds(
  value: number,
  unit: DelayDurationUnit
): number {
  return Math.round(value * UNIT_SECONDS[unit])
}

export function secondsToDelayParts(seconds: number): {
  value: number
  unit: DelayDurationUnit
} {
  const safe = Math.max(1, Math.round(seconds))
  if (safe % UNIT_SECONDS.hour === 0) {
    return { value: safe / UNIT_SECONDS.hour, unit: "hour" }
  }
  if (safe % UNIT_SECONDS.minute === 0) {
    return { value: safe / UNIT_SECONDS.minute, unit: "minute" }
  }
  return { value: safe, unit: "second" }
}

export function formatDelayDuration(seconds: number): string {
  const { value, unit } = secondsToDelayParts(seconds)
  const suffix =
    unit === "second" ? "s" : unit === "minute" ? "min" : "h"
  return `${value} ${suffix}`
}

export function formatCountdown(resumeAt: string): string | null {
  const target = new Date(resumeAt).getTime()
  if (Number.isNaN(target)) return null

  const remainingMs = target - Date.now()
  if (remainingMs <= 0) return null

  const totalSeconds = Math.ceil(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `reprend dans ${hours} h ${minutes} min ${seconds} s`
  }
  if (minutes > 0) {
    return `reprend dans ${minutes} min ${seconds} s`
  }
  return `reprend dans ${seconds} s`
}
