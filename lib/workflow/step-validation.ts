import { CreateWorkflowStepInput, StepType } from "./types"

export function parseStepType(value: unknown): StepType {
  if (value === "delay") return "delay"
  if (value === "condition") return "condition"
  if (value === "http") return "http"
  return "http"
}

const NIL_UUID = "00000000-0000-0000-0000-000000000000"

export function isValidStepEndpointId(value: unknown): boolean {
  if (value == null) return false
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  if (!trimmed || trimmed === NIL_UUID) return false
  return true
}

export function inferStepType(record: Record<string, unknown>): StepType {
  const explicit = record.type
  if (explicit === "delay") return "delay"
  if (explicit === "condition") return "condition"
  if (explicit === "http") return "http"

  const delaySecondsRaw =
    record.delayDurationSeconds ?? record.delay_duration_seconds
  const delaySeconds =
    typeof delaySecondsRaw === "number" && Number.isFinite(delaySecondsRaw)
      ? delaySecondsRaw
      : 0
  const expressionRaw = record.expression
  const hasExpression =
    typeof expressionRaw === "string" && expressionRaw.trim().length > 0

  if (hasExpression) return "condition"
  if (delaySeconds > 0) return "delay"
  return "http"
}

export function validateCreateStepInput(
  input: CreateWorkflowStepInput
): string | null {
  const type = input.type ?? "http"

  if (type === "http") {
    if (!("endpointId" in input) || !isValidStepEndpointId(input.endpointId)) {
      return "endpointId is required for HTTP steps"
    }
    if (input.delayDurationSeconds != null) {
      return "delayDurationSeconds must not be set for HTTP steps"
    }
    return null
  }

  if (type === "delay") {
    if (
      input.delayDurationSeconds == null ||
      input.delayDurationSeconds <= 0
    ) {
      return "delayDurationSeconds is required for delay steps"
    }
    return null
  }

  if (!input.expression?.trim()) {
    return "expression is required for condition steps"
  }
  return null
}

export function validateDelayDurationSeconds(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Duration must be greater than 0"
  }
  return null
}

export function validateConditionExpression(expression: string): string | null {
  if (!expression.trim()) {
    return "Expression is required"
  }
  return null
}
