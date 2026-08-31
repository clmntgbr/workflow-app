/** Absolute timeout bounds (seconds). Plan caps sit within this range. */
export const MIN_STEP_TIMEOUT_SECONDS = 15
export const MAX_STEP_TIMEOUT_SECONDS = 300

/** Known plan timeout caps. */
export const STEP_TIMEOUT_PLAN_CAPS = [15, 30, 60, 300] as const

export function resolveMaxStepTimeoutSeconds(
  maxStepTimeoutSeconds?: number | null
): number {
  if (
    typeof maxStepTimeoutSeconds === "number" &&
    maxStepTimeoutSeconds > 0
  ) {
    return Math.min(
      MAX_STEP_TIMEOUT_SECONDS,
      Math.max(MIN_STEP_TIMEOUT_SECONDS, maxStepTimeoutSeconds)
    )
  }
  return MAX_STEP_TIMEOUT_SECONDS
}

/** Default timeout for new forms: current plan max. */
export function defaultStepTimeoutSeconds(
  maxStepTimeoutSeconds?: number | null
): number {
  return resolveMaxStepTimeoutSeconds(maxStepTimeoutSeconds)
}

export function clampStepTimeoutSeconds(
  value: number,
  maxStepTimeoutSeconds?: number | null
): number {
  const max = resolveMaxStepTimeoutSeconds(maxStepTimeoutSeconds)
  if (!Number.isFinite(value)) return MIN_STEP_TIMEOUT_SECONDS
  return Math.min(max, Math.max(MIN_STEP_TIMEOUT_SECONDS, Math.trunc(value)))
}
