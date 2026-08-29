"use client"

import { RadioDropdown } from "@/components/radio-dropdown"
import { FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { VariableAutocompleteField } from "@/components/workflow/variable-autocomplete-field"
import {
  AssertionOperator,
  operatorNeedsExpectedValue,
} from "@/lib/workflow/assertion/types"
import {
  buildConditionExpression,
  CONDITION_OPERATORS,
  getOperatorLabel,
} from "@/lib/workflow/condition"
import { WorkflowVariable } from "@/lib/workflow/variable/types"
import { useEffect, useMemo, useState } from "react"

interface ConditionExpressionFieldProps {
  value: string
  onChange: (expression: string) => void
  variables: WorkflowVariable[]
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
  variables,
  disabled = false,
  error,
}: ConditionExpressionFieldProps) {
  const initial = useMemo(() => parseExpressionParts(value), [value])
  const [variableToken, setVariableToken] = useState(initial.variableToken)
  const [operator, setOperator] = useState<AssertionOperator>(initial.operator)
  const [expectedValue, setExpectedValue] = useState(initial.expectedValue)

  useEffect(() => {
    const next = parseExpressionParts(value)
    setVariableToken(next.variableToken)
    setOperator(next.operator)
    setExpectedValue(next.expectedValue)
  }, [value])

  const preview = useMemo(() => {
    if (!variableToken.trim()) return value
    try {
      return buildConditionExpression(variableToken, operator, expectedValue)
    } catch {
      return value
    }
  }, [variableToken, operator, expectedValue, value])

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
      onChange(buildConditionExpression(nextVariable, nextOperator, nextExpected))
    } catch {
      // Keep previous expression until valid.
    }
  }

  const needsExpected = operatorNeedsExpectedValue(operator)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Variable</Label>
        <VariableAutocompleteField
          value={variableToken}
          onChange={(next) => {
            if (disabled) return
            setVariableToken(next)
            syncExpression(next, operator, expectedValue)
          }}
          variables={variables}
          placeholder="{{myVariable}}"
        />
        <FieldDescription>
          Pick a workflow variable available from ancestor steps.
        </FieldDescription>
      </div>

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
          />
        </div>
      ) : null}

      <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-3 py-2">
        <FieldLabel className="text-xs text-muted-foreground">
          Expression preview
        </FieldLabel>
        <p className="font-mono text-xs break-all text-foreground">{preview || "—"}</p>
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : null}
      </div>
    </div>
  )
}
