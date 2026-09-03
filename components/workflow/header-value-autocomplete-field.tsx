"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { suggestHeaderValues } from "@/lib/header/api"
import { HeaderValueSuggestion } from "@/lib/header/types"
import { FileText } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

interface HeaderValueAutocompleteFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  wrapperClassName?: string
}

export function HeaderValueAutocompleteField({
  value,
  onChange,
  placeholder,
  className,
  wrapperClassName,
}: HeaderValueAutocompleteFieldProps) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<HeaderValueSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [popoverTop, setPopoverTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const updatePopoverPosition = useCallback(() => {
    if (!inputRef.current || !containerRef.current) return

    const rect = inputRef.current.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()

    setPopoverTop(rect.bottom - containerRect.top + 4)
  }, [])

  const fetchSuggestions = useCallback(async (search: string) => {
    setLoading(true)
    try {
      const response = await suggestHeaderValues({
        search: search || undefined,
        limit: 50,
      })
      setSuggestions(response.items)
    } catch (error) {
      console.error("Failed to fetch header value suggestions:", error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = useCallback(
    (newValue: string) => {
      onChange(newValue)

      // Clear previous timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }

      // Debounce the API call
      fetchTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(newValue)
      }, 200)
    },
    [onChange, fetchSuggestions]
  )

  const handleFocus = useCallback(() => {
    setOpen(true)
    updatePopoverPosition()
    // Fetch all suggestions on focus if not already loaded
    if (suggestions.length === 0) {
      fetchSuggestions(value)
    }
  }, [updatePopoverPosition, suggestions.length, value, fetchSuggestions])

  const handleBlur = useCallback(() => {
    // Delay to allow clicking on suggestions
    setTimeout(() => {
      setOpen(false)
    }, 200)
  }, [])

  const handleSelectValue = useCallback(
    (headerValue: string) => {
      onChange(headerValue)
      setOpen(false)

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 0)
    },
    [onChange]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (open && event.key === "Escape") {
        setOpen(false)
        event.preventDefault()
      }
    },
    [open]
  )

  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [])

  const filteredSuggestions = suggestions

  return (
    <div ref={containerRef} className={cn("relative w-full", wrapperClassName)}>
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("h-9 w-full", className)}
        autoComplete="off"
      />

      {open && filteredSuggestions.length > 0 && (
        <div
          className={cn(
            "absolute inset-x-0 z-50 w-full overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
          )}
          style={{ top: `${popoverTop}px` }}
        >
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Values {loading && "(loading...)"}
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.value}-${index}`}
                type="button"
                className="relative flex min-h-7 w-full cursor-default items-center gap-4 rounded-md p-2 text-xs outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(event) => {
                  event.preventDefault()
                  handleSelectValue(suggestion.value)
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
