"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { WorkflowVariable } from "@/lib/workflow/variable/types"
import { cn } from "@/lib/utils"
import { Braces } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface VariableAutocompleteFieldProps {
  value: string
  onChange: (value: string) => void
  variables: WorkflowVariable[]
  placeholder?: string
  className?: string
  wrapperClassName?: string
  isTextarea?: boolean
}

export function VariableAutocompleteField({
  value,
  onChange,
  variables,
  placeholder,
  className,
  wrapperClassName,
  isTextarea = false,
}: VariableAutocompleteFieldProps) {
  const [open, setOpen] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)

  const getTextBeforeCursor = () => value.substring(0, cursorPosition)
  const getTextAfterCursor = () => value.substring(cursorPosition)

  const getPartialKey = () => {
    const beforeCursor = getTextBeforeCursor()
    const match = beforeCursor.match(/\{\{([a-zA-Z0-9_-]*)$/)
    return match ? match[1] : null
  }

  const partialKey = getPartialKey()

  const filteredVariables =
    partialKey !== null
      ? variables.filter((variable) =>
          variable.key.toLowerCase().includes(partialKey.toLowerCase()) ||
          variable.name.toLowerCase().includes(partialKey.toLowerCase())
        )
      : []

  useEffect(() => {
    if (partialKey !== null && filteredVariables.length > 0) {
      setOpen(true)
      updatePopoverPosition()
    } else {
      setOpen(false)
    }
  }, [partialKey, filteredVariables.length])

  const updatePopoverPosition = () => {
    if (!inputRef.current || !containerRef.current) return

    const rect = inputRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()

    setPopoverPos({
      top: rect.bottom - containerRect.top + 4,
      left: rect.left - containerRect.left,
    })
  }

  const handleSelectVariable = (variableKey: string) => {
    const beforeCursor = getTextBeforeCursor()
    const afterCursor = getTextAfterCursor()

    const withoutPartial = beforeCursor.replace(/\{\{[a-zA-Z0-9_-]*$/, "")
    const insertion = `{{${variableKey}}}`
    const newValue = `${withoutPartial}${insertion}${afterCursor}`
    const newCursorPos = withoutPartial.length + insertion.length

    onChange(newValue)
    setOpen(false)

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = newCursorPos
        inputRef.current.selectionEnd = newCursorPos
        inputRef.current.focus()
      }
    }, 0)
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    if (open && event.key === "Escape") {
      setOpen(false)
      event.preventDefault()
    }
  }

  const updateCursorPosition = () => {
    if (inputRef.current && inputRef.current.selectionStart !== null) {
      setCursorPosition(inputRef.current.selectionStart)
      updatePopoverPosition()
    }
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", wrapperClassName)}>
      {isTextarea ? (
        <Textarea
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCursorPosition}
          onClick={updateCursorPosition}
          placeholder={placeholder}
          className={className}
        />
      ) : (
        <Input
          ref={inputRef as React.Ref<HTMLInputElement>}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCursorPosition}
          onClick={updateCursorPosition}
          placeholder={placeholder}
          className={cn("w-full", className)}
        />
      )}

      {open && filteredVariables.length > 0 ? (
        <div
          className={cn(
            "absolute z-50 min-w-56 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
          )}
          style={{
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
          }}
        >
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Variables
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {filteredVariables.map((variable) => (
              <button
                key={variable.id}
                type="button"
                className="relative flex w-full min-h-7 cursor-default items-center gap-2 rounded-md p-2 text-xs outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(event) => {
                  event.preventDefault()
                  handleSelectVariable(variable.key)
                }}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md border">
                  <Braces className="size-3.5 shrink-0" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-bold">
                    {variable.key}
                  </span>
                  <span className="block truncate">
                    {variable.name} <span className="text-xs text-muted-foreground">
                    {variable.description}
                  </span>
                  </span>
                 
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
