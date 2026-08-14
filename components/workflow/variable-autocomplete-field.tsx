"use client"

import { Textarea } from "@/components/ui/textarea"
import { WorkflowVariable } from "@/lib/workflow/variable/types"
import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"

interface VariableAutocompleteFieldProps {
  value: string
  onChange: (value: string) => void
  variables: WorkflowVariable[]
  placeholder?: string
  className?: string
  isTextarea?: boolean
}

export function VariableAutocompleteField({
  value,
  onChange,
  variables,
  placeholder,
  className,
  isTextarea = false,
}: VariableAutocompleteFieldProps) {
  const [open, setOpen] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  const getTextBeforeCursor = () => {
    return value.substring(0, cursorPosition)
  }

  const getTextAfterCursor = () => {
    return value.substring(cursorPosition)
  }

  // Find if we're after {{ and get the partial key
  const getPartialKey = () => {
    const beforeCursor = getTextBeforeCursor()
    const match = beforeCursor.match(/\{\{([a-zA-Z0-9_-]*)$/)
    return match ? match[1] : null
  }

  const partialKey = getPartialKey()

  // Filter variables by partial key
  const filteredVariables = partialKey !== null
    ? variables.filter((v) =>
        v.key.toLowerCase().includes(partialKey.toLowerCase())
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

    // Remove the partial key after {{
    const withoutPartial = beforeCursor.replace(/\{\{[a-zA-Z0-9_-]*$/, "")
    const newValue = `${withoutPartial}{{${variableKey}}}${afterCursor}`
    const newCursorPos = withoutPartial.length + `{{${variableKey}}}`.length

    onChange(newValue)
    setOpen(false)

    // Move cursor after the closing }}
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = newCursorPos
        inputRef.current.selectionEnd = newCursorPos
        inputRef.current.focus()
      }
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (open && e.key === "Escape") {
      setOpen(false)
      e.preventDefault()
    }
  }

  const updateCursorPosition = () => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart)
      updatePopoverPosition()
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {isTextarea ? (
        <Textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCursorPosition}
          onClick={updateCursorPosition}
          placeholder={placeholder}
          className={className}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCursorPosition}
          onClick={updateCursorPosition}
          placeholder={placeholder}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
            className
          )}
        />
      )}
      {open && filteredVariables.length > 0 && (
        <div
          className="absolute top-full left-0 z-50 w-[200px] rounded-md border bg-popover shadow-md mt-1"
          style={{
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
          }}
        >
          <div className="max-h-[300px] overflow-auto">
            {filteredVariables.length === 0 ? (
              <div className="px-2 py-2 text-sm text-muted-foreground">
                No variables found
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {filteredVariables.map((variable) => (
                  <button
                    key={variable.id}
                    type="button"
                    className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer font-mono text-xs"
                    onClick={() => handleSelectVariable(variable.key)}
                  >
                    {variable.key}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
