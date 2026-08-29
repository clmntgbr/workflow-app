"use client"

import { RadioDropdown } from "@/components/radio-dropdown"
import { Badge } from "@/components/ui/badge"
import { FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { VariablePickerField } from "@/components/workflow/variable-picker-field"
import {
  AssertionOperator,
  operatorNeedsExpectedValue,
} from "@/lib/workflow/assertion/types"
import {
  buildConditionExpression,
  CONDITION_OPERATORS,
  getOperatorLabel,
} from "@/lib/workflow/condition"
import { useMemo, useState } from "react"

interface ConditionExpressionFieldProps {
  value: string
  onChange: (expression: string) => void
  workflowId: string
  stepId: string
  disabled?: boolean
  error?: string | null
}

function parseExpressionParts(expression: string): {
  variableToken: string
  operator: AssertionOperator
  expectedValue: string
} {
  const trimmed = expression.trim()
  if (!trimmed || trimmed === "true" || trimmed === "false") {
    return {
      variableToken: "",
      operator: "equals",
      expectedValue: "",
    }
  }

  const equalsMatch = trimmed.match(/^(\{\{[^}]+\}\})\s*==\s*(.+)$/)
  if (equalsMatch) {
    return {
      variableToken: equalsMatch[1],
      operator: "equals",
      expectedValue: unquoteExpected(equalsMatch[2]),
    }
  }

  const notEqualsMatch = trimmed.match(/^(\{\{[^}]+\}\})\s*!=\s*(.+)$/)
  if (notEqualsMatch && !trimmed.includes("&&")) {
    return {
      variableToken: notEqualsMatch[1],
      operator: "not_equals",
      expectedValue: unquoteExpected(notEqualsMatch[2]),
    }
  }

  const containsMatch = trimmed.match(/^contains\((\{\{[^}]+\}\}),\s*(.+)\)$/)
  if (containsMatch) {
    return {
      variableToken: containsMatch[1],
      operator: "contains",
      expectedValue: unquoteExpected(containsMatch[2]),
    }
  }

  const variableMatch = trimmed.match(/\{\{[^}]+\}\}/)
  return {
    variableToken: variableMatch?.[0] ?? "",
    operator: "equals",
    expectedValue: "",
  }
}

function unquoteExpected(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export function ConditionExpressionField({
  value,
  onChange,
  workflowId,
  stepId,
  disabled = false,
  error,
}: ConditionExpressionFieldProps) {
  const parsedValue = useMemo(() => parseExpressionParts(value), [value])
  const [variableToken, setVariableToken] = useState(parsedValue.variableToken)
  const [operator, setOperator] = useState<AssertionOperator>(
    parsedValue.operator
  )
  const [expectedValue, setExpectedValue] = useState(parsedValue.expectedValue)
  const [prevValue, setPrevValue] = useState(value)

  if (value !== prevValue) {
    setPrevValue(value)
    setVariableToken(parsedValue.variableToken)
    setOperator(parsedValue.operator)
    setExpectedValue(parsedValue.expectedValue)
  }

  const syncExpression = (
    nextVariable: string,
    nextOperator: AssertionOperator,
    nextExpected: string
  ) => {
    if (!nextVariable.trim()) {
      onChange("")
      return
    }
    try {
      onChange(
        buildConditionExpression(nextVariable, nextOperator, nextExpected)
      )
    } catch {
      // Keep previous expression until valid.
    }
  }

  const needsExpected = operatorNeedsExpectedValue(operator)
  const displayVariable = variableToken.trim()
    ? variableToken.replace(/^\{\{/, "").replace(/\}\}$/, "")
    : null
  const displayExpected = expectedValue.trim() || null
  const hasPreviewParts = Boolean(displayVariable)

  return (
    <div className="space-y-4">
      <VariablePickerField
        id="condition-variable"
        workflowId={workflowId}
        stepId={stepId}
        value={variableToken}
        disabled={disabled}
        isRequired
        onChange={(next) => {
          if (disabled) return
          setVariableToken(next)
          syncExpression(next, operator, expectedValue)
        }}
      />

      <div className="space-y-2">
        <Label>Operator</Label>
        <RadioDropdown
          modal={false}
          contentClassName="z-[110]"
          disabled={disabled}
          value={operator}
          onValueChange={(next) => {
            setOperator(next)
            syncExpression(variableToken, next, expectedValue)
          }}
          options={[...CONDITION_OPERATORS]}
          getValue={(item) => item}
          getLabel={(item) => getOperatorLabel(item)}
          groupLabel="Operator"
          placeholder="Select operator"
        />
      </div>

      {needsExpected ? (
        <div className="space-y-2">
          <Label htmlFor="condition-expected-value">Compare value</Label>
          <Input
            id="condition-expected-value"
            value={expectedValue}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value
              setExpectedValue(next)
              syncExpression(variableToken, operator, next)
            }}
            placeholder="Expected value"
            className="h-9"
          />
        </div>
      ) : null}

      <div className="space-y-3 rounded-lg border border-border bg-muted/40 px-3 py-4">
        <FieldLabel className="text-xs text-muted-foreground">
          Expression preview
        </FieldLabel>
        {hasPreviewParts ? (
          <div className="flex flex-wrap items-center gap-2 py-1">
            <Badge
              variant="secondary"
              className="max-w-full font-bold text-green-700"
            >
              {displayVariable}
            </Badge>
            <Badge variant="outline" className="font-medium">
              {getOperatorLabel(operator)}
            </Badge>
            {needsExpected && displayExpected ? (
              <Badge variant="secondary" className="max-w-full">
                {displayExpected}
              </Badge>
            ) : null}
          </div>
        ) : (
          <p className="py-1 text-xs text-muted-foreground">—</p>
        )}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {!error ? (
          <FieldDescription className="text-xs">
            The expression is evaluated at runtime to pick the true or false
            branch.
          </FieldDescription>
        ) : null}
      </div>
    </div>
  )
}
