"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { WorkflowVariable } from "@/lib/workflow/variable/types"
import { Braces } from "lucide-react"
import { useRef, useState } from "react"

interface VariableAutocompleteFieldProps {
  value: string
  onChange: (value: string) => void
  variables: WorkflowVariable[]
  placeholder?: string
  className?: string
  wrapperClassName?: string
  isTextarea?: boolean
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function highlightVariablesHtml(text: string): string {
  const escaped = escapeHtml(text)
  return escaped.replaceAll(
    /\{\{[a-zA-Z0-9_-]+\}\}/g,
    (match) =>
      `<span class="text-green-600 dark:text-green-600 font-medium">${match}</span>`
  )
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
  const [forceClosed, setForceClosed] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [popoverTop, setPopoverTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const prevPartialKeyRef = useRef<string | null>(null)

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
      ? variables.filter(
          (variable) =>
            variable.key.toLowerCase().includes(partialKey.toLowerCase()) ||
            variable.name.toLowerCase().includes(partialKey.toLowerCase())
        )
      : []

  if (partialKey !== prevPartialKeyRef.current) {
    prevPartialKeyRef.current = partialKey
    if (forceClosed) setForceClosed(false)
  }

  const open =
    partialKey !== null && filteredVariables.length > 0 && !forceClosed

  const updatePopoverPosition = () => {
    if (!inputRef.current || !containerRef.current) return

    const rect = inputRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()

    setPopoverTop(rect.bottom - containerRect.top + 4)
  }

  const handleSelectVariable = (variableKey: string) => {
    const beforeCursor = getTextBeforeCursor()
    const afterCursor = getTextAfterCursor()

    const withoutPartial = beforeCursor.replace(/\{\{[a-zA-Z0-9_-]*$/, "")
    const insertion = `{{${variableKey}}}`
    const newValue = `${withoutPartial}${insertion}${afterCursor}`
    const newCursorPos = withoutPartial.length + insertion.length

    onChange(newValue)
    setForceClosed(true)

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
      setForceClosed(true)
      event.preventDefault()
    }
  }

  const updateCursorPosition = () => {
    if (inputRef.current && inputRef.current.selectionStart !== null) {
      setCursorPosition(inputRef.current.selectionStart)
      updatePopoverPosition()
    }
  }

  const syncBackdropScroll = () => {
    if (!isTextarea || !inputRef.current || !backdropRef.current) return
    backdropRef.current.scrollTop = inputRef.current.scrollTop
    backdropRef.current.scrollLeft = inputRef.current.scrollLeft
  }

  const textMetricsClassName = cn(
    "text-sm md:text-xs/relaxed",
    className?.includes("font-mono") && "font-mono",
    className?.includes("text-xs") && "text-xs leading-relaxed"
  )

  const fieldClassName = cn(
    "relative z-10 border-0 bg-transparent text-transparent caret-foreground shadow-none",
    "focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent",
    "placeholder:text-muted-foreground",
    textMetricsClassName,
    className
  )

  const highlightedHtml =
    highlightVariablesHtml(value) + (isTextarea ? "\n" : "")

  return (
    <div ref={containerRef} className={cn("relative w-full", wrapperClassName)}>
      <div
        className={cn(
          "relative w-full rounded-md border border-input bg-input/20 dark:bg-input/30",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
          isTextarea ? "overflow-hidden" : "h-9"
        )}
      >
        <div
          ref={backdropRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 z-0 overflow-hidden text-foreground",
            isTextarea
              ? "px-2 py-2 break-words whitespace-pre-wrap"
              : "flex items-center overflow-hidden px-2 whitespace-pre",
            textMetricsClassName
          )}
          dangerouslySetInnerHTML={{ __html: highlightedHtml || "&nbsp;" }}
        />

        {isTextarea ? (
          <Textarea
            ref={inputRef as React.Ref<HTMLTextAreaElement>}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={updateCursorPosition}
            onClick={updateCursorPosition}
            onSelect={updateCursorPosition}
            onScroll={syncBackdropScroll}
            placeholder={placeholder}
            className={cn("break-words", fieldClassName)}
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
            onSelect={updateCursorPosition}
            placeholder={placeholder}
            className={cn("h-9 w-full", fieldClassName)}
          />
        )}
      </div>

      {open && filteredVariables.length > 0 ? (
        <div
          className={cn(
            "absolute inset-x-0 z-50 w-full overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
          )}
          style={{ top: `${popoverTop}px` }}
        >
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Variables
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {filteredVariables.map((variable) => (
              <button
                key={variable.id}
                type="button"
                className="relative flex min-h-7 w-full cursor-default items-center gap-4 rounded-md p-2 text-xs outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
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
                    {variable.name}{" "}
                    <span className="text-xs text-muted-foreground">
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
