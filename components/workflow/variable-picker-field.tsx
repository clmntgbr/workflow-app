"use client"

import { Badge } from "@/components/ui/badge"
import { FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { listAvailableVariables } from "@/lib/workflow/variable/api"
import { subscribeWorkflowVariablesRefetch } from "@/lib/workflow/variable/variable-realtime"
import { WorkflowVariable } from "@/lib/workflow/variable/types"
import { Braces, Loader2Icon } from "lucide-react"
import { useCallback, useEffect, useId, useRef, useState } from "react"

interface VariablePickerFieldProps {
  id?: string
  workflowId: string
  stepId: string
  value: string
  onChange: (value: string) => void
  isRequired?: boolean
  label?: string
  description?: string
  disabled?: boolean
}

function toVariableToken(key: string): string {
  const normalized = key.trim()
  if (!normalized) return ""
  if (/^\{\{[^}]+\}\}$/.test(normalized)) return normalized
  return `{{${normalized}}}`
}

function toDisplayKey(value: string): string {
  return value.replace(/^\{\{/, "").replace(/\}\}$/, "").trim()
}

function formatVariableBadge(variable: WorkflowVariable): string {
  if (variable.kind === "static") {
    if (variable.value === undefined || variable.value === null) return "static"
    if (typeof variable.value === "string") return variable.value
    try {
      return JSON.stringify(variable.value)
    } catch {
      return "static"
    }
  }
  return variable.path ?? "extracted"
}

export function VariablePickerField({
  id,
  workflowId,
  stepId,
  value,
  onChange,
  isRequired = false,
  label = "Variable",
  description = "Pick a workflow variable available from ancestor steps",
  disabled = false,
}: VariablePickerFieldProps) {
  const generatedId = useId()
  const resolvedId = id ?? generatedId
  const containerRef = useRef<HTMLDivElement>(null)
  const requestIdRef = useRef(0)

  const [open, setOpen] = useState(false)
  const [variables, setVariables] = useState<WorkflowVariable[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [displayKey, setDisplayKey] = useState(toDisplayKey(value))

  const loadVariables = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setIsLoading(true)

    try {
      const next = await listAvailableVariables(workflowId, stepId)
      if (requestId !== requestIdRef.current) return
      setVariables(next)
    } catch {
      if (requestId !== requestIdRef.current) return
      setVariables([])
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [workflowId, stepId])

  useEffect(() => {
    setDisplayKey(toDisplayKey(value))
  }, [value])

  useEffect(() => {
    if (disabled) return
    void loadVariables()
  }, [disabled, loadVariables])

  useEffect(() => {
    if (!open || disabled) return
    void loadVariables()
  }, [open, disabled, loadVariables])

  useEffect(() => {
    if (!open || disabled) return

    return subscribeWorkflowVariablesRefetch(workflowId, () => {
      void loadVariables()
    })
  }, [open, disabled, workflowId, loadVariables])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [open])

  const searchTerm = displayKey.toLowerCase()
  const filteredVariables = variables.filter((variable) => {
    if (!searchTerm) return true
    return (
      variable.key.toLowerCase().includes(searchTerm) ||
      variable.name.toLowerCase().includes(searchTerm)
    )
  })

  const isKnownVariable = variables.some(
    (variable) => variable.key === displayKey
  )

  const handleSelect = (variable: WorkflowVariable) => {
    setDisplayKey(variable.key)
    onChange(toVariableToken(variable.key))
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="w-full space-y-2">
      <Label htmlFor={resolvedId}>
        {label}
        {isRequired ? <span className="text-destructive">*</span> : null}
      </Label>

      <div className="relative w-full">
        <div
          className={cn(
            "relative w-full rounded-md border border-input bg-white shadow-none dark:bg-background",
            "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
          )}
        >
          <Input
            id={resolvedId}
            value={displayKey}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value.replace(/[{}]/g, "")
              setDisplayKey(next)
              onChange(toVariableToken(next))
              setOpen(true)
            }}
            onFocus={() => {
              setDisplayKey(toDisplayKey(value))
              setOpen(true)
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false)
            }}
            className={cn(
              "h-9 border-0 bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0",
              isKnownVariable && "font-bold text-green-600"
            )}
            placeholder="myVariable"
            autoComplete="off"
          />
        </div>

        {open ? (
          <div
            className={cn(
              "absolute inset-x-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
            )}
          >
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Variables
            </div>
            <div className="max-h-[280px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 px-2 py-6 text-xs text-muted-foreground">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Loading variables…
                </div>
              ) : filteredVariables.length === 0 ? (
                <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No variables found. Add variables on ancestor steps first.
                </div>
              ) : (
                filteredVariables.map((variable) => (
                  <button
                    key={variable.id}
                    type="button"
                    className="relative flex min-h-7 w-full cursor-default items-center gap-4 rounded-md border border-transparent p-2 text-xs outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      handleSelect(variable)
                    }}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md border">
                      <Braces className="size-3.5 shrink-0" />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate font-bold">
                        {variable.key}
                      </span>
                      <span className="block truncate text-muted-foreground">
                        {variable.name}
                      </span>
                    </span>
                    <span className="flex max-w-[40%] shrink-0 flex-col items-end gap-1 px-1.5 py-0.5">
                      <Badge
                        variant="secondary"
                        className="max-w-full truncate"
                      >
                        {formatVariableBadge(variable)}
                      </Badge>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>

      <FieldDescription className="text-xs text-muted-foreground">
        {description}
      </FieldDescription>
    </div>
  )
}
