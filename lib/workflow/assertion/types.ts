export const ASSERTION_SOURCES = ["status", "header", "body"] as const
export type AssertionSource = (typeof ASSERTION_SOURCES)[number]

export const ASSERTION_OPERATORS = [
  "equals",
  "not_equals",
  "not_null",
  "is_null",
  "contains",
  "greater_than",
  "less_than",
  "matches_regex",
  "is_string",
  "is_number",
  "is_boolean",
  "is_array",
  "is_object",
] as const

export type AssertionOperator = (typeof ASSERTION_OPERATORS)[number]

export const OPERATORS_WITHOUT_EXPECTED_VALUE: AssertionOperator[] = [
  "not_null",
  "is_null",
  "is_string",
  "is_number",
  "is_boolean",
  "is_array",
  "is_object",
]

export interface Assertion {
  id: string
  description: string | null
  source: AssertionSource
  path: string | null
  operator: AssertionOperator
  expectedValue: string | null
  stepId: string
  workflowId: string
  createdAt: string
  updatedAt: string
}

export interface CreateAssertionInput {
  description?: string
  source: AssertionSource
  path?: string | null
  operator: AssertionOperator
  expectedValue?: string | null
}

export interface UpdateAssertionInput {
  description?: string
  source: AssertionSource
  path?: string | null
  operator: AssertionOperator
  expectedValue?: string | null
}

export function sourceNeedsPath(source: AssertionSource): boolean {
  return source === "header" || source === "body"
}

export function operatorNeedsExpectedValue(operator: AssertionOperator): boolean {
  return !OPERATORS_WITHOUT_EXPECTED_VALUE.includes(operator)
}

export function formatAssertionSummary(assertion: Assertion): string {
  const parts: string[] = [assertion.source]

  if (assertion.source !== "status" && assertion.path) {
    parts.push(assertion.path)
  }

  parts.push(assertion.operator.replace(/_/g, " "))

  if (
    operatorNeedsExpectedValue(assertion.operator) &&
    assertion.expectedValue != null &&
    assertion.expectedValue !== ""
  ) {
    parts.push(`"${assertion.expectedValue}"`)
  }

  return parts.join(" · ")
}
