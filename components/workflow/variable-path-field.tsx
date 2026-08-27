"use client"

import { FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { listStepAssertionPaths } from "@/lib/workflow/assertion/api"
import { listStepVariablePaths } from "@/lib/workflow/variable/api"
import { Code2, Loader2Icon } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

const PAGE_LIMIT = 20
const SEARCH_DEBOUNCE_MS = 300

interface VariablePathFieldProps {
  id?: string
  workflowId: string
  stepId: string
  value: string
  onChange: (value: string) => void
  isRequired?: boolean
  label?: string
  description?: string
  maxLength?: number
  hasCharacterLimit?: boolean
  disabled?: boolean
  pathsKind?: "variable" | "assertion"
}

export function VariablePathField({
  id,
  workflowId,
  stepId,
  value,
  onChange,
  isRequired = false,
  label = "Path",
  description = "JSONPath into the response body",
  maxLength = 255,
  hasCharacterLimit = true,
  disabled = false,
  pathsKind = "variable",
}: VariablePathFieldProps) {
  const generatedId = useId()
  const resolvedId = id ?? generatedId
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const requestIdRef = useRef(0)
  const loadingMoreRef = useRef(false)

  const [open, setOpen] = useState(false)
  const [paths, setPaths] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [search, setSearch] = useState(value)
  const [debouncedSearch, setDebouncedSearch] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const requestId = ++requestIdRef.current
    loadingMoreRef.current = false

    const load = async () => {
      if (!cancelled && requestId === requestIdRef.current) {
        setIsLoadingMore(false)
      }

      const fetchPaths =
        pathsKind === "assertion"
          ? listStepAssertionPaths
          : listStepVariablePaths

      try {
        const result = await fetchPaths(workflowId, stepId, {
          page: 1,
          limit: PAGE_LIMIT,
          search: debouncedSearch || undefined,
        })
        if (cancelled || requestId !== requestIdRef.current) return
        setPaths(result.members)
        setPage(result.page)
        setTotalPages(result.totalPages)
      } catch {
        if (cancelled || requestId !== requestIdRef.current) return
        setPaths([])
        setPage(1)
        setTotalPages(0)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [open, workflowId, stepId, debouncedSearch, pathsKind])

  useEffect(() => {
    if (!open) return
    if (page >= totalPages) return

    const sentinel = sentinelRef.current
    const root = listRef.current
    if (!sentinel || !root) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        if (loadingMoreRef.current) return
        if (page >= totalPages) return

        const nextPage = page + 1
        const requestId = ++requestIdRef.current
        loadingMoreRef.current = true
        setIsLoadingMore(true)

        const fetchPaths =
          pathsKind === "assertion"
            ? listStepAssertionPaths
            : listStepVariablePaths

        void fetchPaths(workflowId, stepId, {
          page: nextPage,
          limit: PAGE_LIMIT,
          search: debouncedSearch || undefined,
        })
          .then((result) => {
            if (requestId !== requestIdRef.current) return
            setPaths((current) => {
              const seen = new Set(current)
              const appended = result.members.filter((path) => !seen.has(path))
              return [...current, ...appended]
            })
            setPage(result.page)
            setTotalPages(result.totalPages)
          })
          .catch(() => {
            // keep current list
          })
          .finally(() => {
            if (requestId === requestIdRef.current) {
              loadingMoreRef.current = false
              setIsLoadingMore(false)
            }
          })
      },
      { root, rootMargin: "40px", threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [open, page, totalPages, workflowId, stepId, debouncedSearch, pathsKind])

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

  const handleChange = (next: string) => {
    if (hasCharacterLimit && maxLength > 0 && next.length > maxLength) return
    onChange(next)
    setSearch(next)
    setOpen(true)
  }

  const handleSelect = (path: string) => {
    onChange(path)
    setSearch(path)
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
            value={value}
            disabled={disabled}
            maxLength={
              hasCharacterLimit && maxLength > 0 ? maxLength : undefined
            }
            onChange={(event) => handleChange(event.target.value)}
            onFocus={() => {
              setSearch(value)
              setOpen(true)
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false)
            }}
            className="h-9 border-0 bg-transparent pr-14 shadow-none focus-visible:border-transparent focus-visible:ring-0"
            placeholder="$"
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
              Paths
            </div>
            <div ref={listRef} className="max-h-[280px] overflow-y-auto">
              {paths.length === 0 ? (
                <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No paths found. Run the step successfully to discover JSON
                  paths.
                </div>
              ) : (
                <>
                  {paths.map((path) => (
                    <button
                      key={path}
                      type="button"
                      className="relative flex min-h-7 w-full cursor-default items-center gap-4 rounded-md p-2 text-xs outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        handleSelect(path)
                      }}
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md border">
                        <Code2 className="size-3.5 shrink-0" />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate">{path}</span>
                      </span>
                    </button>
                  ))}
                  <div ref={sentinelRef} className="h-1 w-full" />
                  {isLoadingMore ? (
                    <div className="flex items-center justify-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                      <Loader2Icon className="size-3.5 animate-spin" />
                      Loading more…
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex w-full flex-row items-start justify-between gap-2">
        <FieldDescription className="min-w-0 flex-1 text-xs text-muted-foreground">
          {description}
        </FieldDescription>
        {hasCharacterLimit && maxLength > 0 ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            {value.length}/{maxLength}
          </span>
        ) : null}
      </div>
    </div>
  )
}
