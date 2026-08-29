import {
  ASSERTION_OPERATORS,
  AssertionOperator,
  operatorNeedsExpectedValue,
} from "@/lib/workflow/assertion/types"
import { WorkflowConnection } from "@/lib/workflow/types"

export type ConditionBranch = "true" | "false"

export const CONDITION_BRANCH_LABELS: Record<ConditionBranch, string> = {
  true: "true",
  false: "false",
}

export const DEFAULT_CONDITION_EXPRESSION = "true"

export function isConditionBranch(value: unknown): value is ConditionBranch {
  return value === "true" || value === "false"
}

export function parseConditionBranch(
  value: unknown
): ConditionBranch | null | undefined {
  if (value === null) return null
  if (isConditionBranch(value)) return value
  return undefined
}

function quoteExpectedValue(value: string): string {
  const trimmed = value.trim()
  if (trimmed === "true" || trimmed === "false") return trimmed
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed
  return JSON.stringify(trimmed)
}

export function buildConditionExpression(
  variableToken: string,
  operator: AssertionOperator,
  expectedValue: string
): string {
  const variable = variableToken.trim()
  if (!variable) {
    throw new Error("Variable is required")
  }

  switch (operator) {
    case "equals":
      return `${variable} == ${quoteExpectedValue(expectedValue)}`
    case "not_equals":
      return `${variable} != ${quoteExpectedValue(expectedValue)}`
    case "not_null":
      return `${variable} != nil && ${variable} != ""`
    case "is_null":
      return `${variable} == nil || ${variable} == ""`
    case "contains":
      return `contains(${variable}, ${quoteExpectedValue(expectedValue)})`
    case "greater_than":
      return `${variable} > ${quoteExpectedValue(expectedValue)}`
    case "less_than":
      return `${variable} < ${quoteExpectedValue(expectedValue)}`
    case "matches_regex":
      return `matches(${variable}, ${quoteExpectedValue(expectedValue)})`
    case "is_string":
      return `type(${variable}) == "string"`
    case "is_number":
      return `type(${variable}) == "float" || type(${variable}) == "int"`
    case "is_boolean":
      return `type(${variable}) == "bool"`
    case "is_array":
      return `type(${variable}) == "array"`
    case "is_object":
      return `type(${variable}) == "map"`
    default:
      return `${variable} == ${quoteExpectedValue(expectedValue)}`
  }
}

export function formatConditionExpressionSummary(expression: string | null): string {
  if (!expression?.trim()) return "—"
  const trimmed = expression.trim()
  if (trimmed.length <= 48) return trimmed
  return `${trimmed.slice(0, 45)}…`
}

export function canConnectToTarget(
  targetStepId: string,
  connections: WorkflowConnection[]
): { allowed: boolean; reason?: string } {
  const incoming = connections.filter(
    (connection) => connection.targetStepId === targetStepId
  )
  if (incoming.length > 0) {
    return {
      allowed: false,
      reason:
        "This step already has an incoming connection. Conditional branch targets can only have one parent.",
    }
  }
  return { allowed: true }
}

export function validateNewConnection(
  input: {
    sourceStepId: string
    targetStepId: string
    sourceHandle?: string | null
  },
  steps: { id: string; type: string }[],
  connections: WorkflowConnection[]
): { allowed: boolean; reason?: string } {
  if (input.sourceStepId === input.targetStepId) {
    return { allowed: false, reason: "A step cannot connect to itself." }
  }

  const targetCheck = canConnectToTarget(input.targetStepId, connections)
  if (!targetCheck.allowed) return targetCheck

  const sourceStep = steps.find((step) => step.id === input.sourceStepId)
  if (sourceStep?.type === "condition") {
    const branch = input.sourceHandle
    if (branch !== "true" && branch !== "false") {
      return {
        allowed: false,
        reason: "Connect from the true (green) or false (red) output on the condition step.",
      }
    }

    const existing = connections.filter(
      (connection) => connection.sourceStepId === sourceStep.id
    )
    if (existing.some((connection) => connection.branch === branch)) {
      return {
        allowed: false,
        reason: `The "${CONDITION_BRANCH_LABELS[branch]}" branch is already connected.`,
      }
    }
  }

  return { allowed: true }
}

export function getOperatorLabel(operator: AssertionOperator): string {
  return operator.replace(/_/g, " ")
}

export const CONDITION_OPERATORS = ASSERTION_OPERATORS
