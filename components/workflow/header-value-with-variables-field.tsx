"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { suggestHeaderValues } from "@/lib/header/api"
import { HeaderValueSuggestion } from "@/lib/header/types"
import { WorkflowVariable } from "@/lib/workflow/variable/types"
import { Braces, FileText } from "lucide-react"
import { useRef, useState, useCallback, useEffect } from "react"

interface HeaderValueWithVariablesFieldProps {
  value: string
  onChange: (value: string) => void
  variables: WorkflowVariable[]
  placeholder?: string
  className?: string
  wrapperClassName?: string
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

export function HeaderValueWithVariablesField({
  value,
  onChange,
  variables,
  placeholder,
  className,
  wrapperClassName,
}: HeaderValueWithVariablesFieldProps) {
  const [forceClosed, setForceClosed] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [popoverTop, setPopoverTop] = useState(0)
  const [headerSuggestions, setHeaderSuggestions] = useState<HeaderValueSuggestion[]>([])
  const [loadingHeaders, setLoadingHeaders] = useState(false)
  const [showHeaderSuggestions, setShowHeaderSuggestions] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const prevPartialKeyRef = useRef<string | null>(null)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  const openVariableSuggestions =
    partialKey !== null && filteredVariables.length > 0 && !forceClosed

  const updatePopoverPosition = () => {
    if (!inputRef.current || !containerRef.current) return

    const rect = inputRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()

    setPopoverTop(rect.bottom - containerRect.top + 4)
  }

  const fetchHeaderSuggestions = useCallback(async (search: string) => {
    setLoadingHeaders(true)
    try {
      const response = await suggestHeaderValues({
        search: search || undefined,
        limit: 50,
      })
      setHeaderSuggestions(response.items)
    } catch (error) {
      console.error("Failed to fetch header value suggestions:", error)
      setHeaderSuggestions([])
    } finally {
      setLoadingHeaders(false)
    }
  }, [])

  const handleSelectVariable = (variableKey: string) => {
    const beforeCursor = getTextBeforeCursor()
    const afterCursor = getTextAfterCursor()

    const withoutPartial = beforeCursor.replace(/\{\{[a-zA-Z0-9_-]*$/, "")
    const insertion = `{{${variableKey}}}`
    const newValue = `${withoutPartial}${insertion}${afterCursor}`
    const newCursorPos = withoutPartial.length + insertion.length

    onChange(newValue)
    setForceClosed(true)
    setShowHeaderSuggestions(false)

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = newCursorPos
        inputRef.current.selectionEnd = newCursorPos
        inputRef.current.focus()
      }
    }, 0)
  }

  const handleSelectHeaderValue = useCallback(
    (headerValue: string) => {
      onChange(headerValue)
      setShowHeaderSuggestions(false)

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 0)
    },
    [onChange]
  )

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if ((openVariableSuggestions || showHeaderSuggestions) && event.key === "Escape") {
      setForceClosed(true)
      setShowHeaderSuggestions(false)
      event.preventDefault()
    }
  }

  const handleInputChange = useCallback(
    (newValue: string) => {
      onChange(newValue)

      // Clear previous timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }

      // Only fetch header suggestions if not typing a variable
      if (!newValue.includes("{{")) {
        fetchTimeoutRef.current = setTimeout(() => {
          fetchHeaderSuggestions(newValue)
        }, 200)
      }
    },
    [onChange, fetchHeaderSuggestions]
  )

  const handleFocus = useCallback(() => {
    updatePopoverPosition()
    // Fetch header suggestions on focus if not already loaded
    if (headerSuggestions.length === 0 && !value.includes("{{")) {
      fetchHeaderSuggestions(value)
      setShowHeaderSuggestions(true)
    } else if (!value.includes("{{")) {
      setShowHeaderSuggestions(true)
    }
  }, [updatePopoverPosition, headerSuggestions.length, value, fetchHeaderSuggestions])

  const handleBlur = useCallback(() => {
    // Delay to allow clicking on suggestions
    setTimeout(() => {
      setShowHeaderSuggestions(false)
    }, 200)
  }, [])

  const updateCursorPosition = () => {
    if (inputRef.current && inputRef.current.selectionStart !== null) {
      setCursorPosition(inputRef.current.selectionStart)
      updatePopoverPosition()
    }
  }

  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [])

  const textMetricsClassName = cn(
    "text-sm md:text-xs/relaxed",
    className?.includes("text-xs") && "text-xs leading-relaxed"
  )

  const fieldClassName = cn(
    "relative z-10 border-0 bg-transparent text-transparent caret-foreground shadow-none",
    "focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent",
    "placeholder:text-muted-foreground",
    textMetricsClassName,
    className
  )

  const highlightedHtml = highlightVariablesHtml(value)

  return (
    <div ref={containerRef} className={cn("relative w-full", wrapperClassName)}>
      <div
        className={cn(
          "relative w-full rounded-md border border-input bg-input/20 dark:bg-input/30",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
          "h-9"
        )}
      >
        <div
          ref={backdropRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 z-0 overflow-hidden text-foreground",
            "flex items-center overflow-hidden px-2 whitespace-pre",
            textMetricsClassName
          )}
          dangerouslySetInnerHTML={{ __html: highlightedHtml || "&nbsp;" }}
        />

        <Input
          ref={inputRef as React.Ref<HTMLInputElement>}
          type="text"
          value={value}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCursorPosition}
          onClick={updateCursorPosition}
          onSelect={updateCursorPosition}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn("h-9 w-full", fieldClassName)}
        />
      </div>

      {openVariableSuggestions && filteredVariables.length > 0 ? (
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
                      {variable.kind === "static"
                        ? "static"
                        : variable.path
                          ? variable.path
                          : variable.description}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showHeaderSuggestions && !openVariableSuggestions && headerSuggestions.length > 0 && (
        <div
          className={cn(
            "absolute inset-x-0 z-50 w-full overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
          )}
          style={{ top: `${popoverTop}px` }}
        >
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Values {loadingHeaders && "(loading...)"}
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {headerSuggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.value}-${index}`}
                type="button"
                className="relative flex min-h-7 w-full cursor-default items-center gap-4 rounded-md p-2 text-xs outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(event) => {
                  event.preventDefault()
                  handleSelectHeaderValue(suggestion.value)
                }}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md border">
                  <FileText className="size-3.5 shrink-0" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-bold">
                    {suggestion.value}
                  </span>
                  <span className="block truncate text-muted-foreground">
                    {suggestion.count} {suggestion.count === 1 ? "use" : "uses"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
