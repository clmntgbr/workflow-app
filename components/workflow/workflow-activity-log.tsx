"use client"

import { EmptyComponent } from "@/components/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { subscribeWorkflowActivityRefetch } from "@/lib/workflow/activity/activity-realtime"
import { listWorkflowActivity } from "@/lib/workflow/activity/api"
import {
  formatActivityTime,
  getActivityEntryDetails,
  getActivityLevelClass,
  WorkflowActivityEntry,
} from "@/lib/workflow/activity/types"
import { Loader2Icon, ScrollTextIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

const PAGE_LIMIT = 20

function reverseChronologicalPage(
  entries: WorkflowActivityEntry[]
): WorkflowActivityEntry[] {
  return [...entries].reverse()
}

function mergeOlderEntries(
  current: WorkflowActivityEntry[],
  olderPage: WorkflowActivityEntry[]
): WorkflowActivityEntry[] {
  const seen = new Set(current.map((entry) => entry.id))
  const prepended = reverseChronologicalPage(olderPage).filter(
    (entry) => !seen.has(entry.id)
  )
  return [...prepended, ...current]
}

interface WorkflowActivityLogProps {
  workflowId: string
}

export function WorkflowActivityLog({ workflowId }: WorkflowActivityLogProps) {
  const requestIdRef = useRef(0)
  const loadingMoreRef = useRef(false)
  const shouldScrollToBottomRef = useRef(true)
  const listRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)

  const [entries, setEntries] = useState<WorkflowActivityEntry[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasError, setHasError] = useState(false)

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      const requestId = ++requestIdRef.current

      if (!options?.silent) {
        loadingMoreRef.current = false
        shouldScrollToBottomRef.current = true
        setIsLoading(true)
        setHasError(false)
        setExpanded({})
      }

      try {
        const result = await listWorkflowActivity(workflowId, {
          page: 1,
          limit: PAGE_LIMIT,
        })
        if (requestId !== requestIdRef.current) return

        const freshPage = reverseChronologicalPage(result.members)

        if (options?.silent) {
          setEntries((current) => {
            const seen = new Set(current.map((entry) => entry.id))
            const newOnes = freshPage.filter((entry) => !seen.has(entry.id))
            if (newOnes.length === 0) return current
            shouldScrollToBottomRef.current = true
            return [...current, ...newOnes]
          })
        } else {
          setEntries(freshPage)
        }

        setPage(result.page)
        setTotalPages(result.totalPages)
      } catch {
        if (requestId !== requestIdRef.current) return
        if (!options?.silent) {
          setEntries([])
          setPage(1)
          setTotalPages(0)
          setHasError(true)
        }
      } finally {
        if (!options?.silent && requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [workflowId]
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return subscribeWorkflowActivityRefetch(workflowId, () => {
      void load({ silent: true })
    })
  }, [workflowId, load])

  useEffect(() => {
    if (!shouldScrollToBottomRef.current || entries.length === 0) return

    const list = listRef.current
    if (!list) return

    requestAnimationFrame(() => {
      list.scrollTop = list.scrollHeight
      shouldScrollToBottomRef.current = false
    })
  }, [entries, isLoading])

  useEffect(() => {
    if (page >= totalPages || totalPages === 0) return

    const sentinel = topSentinelRef.current
    const root = listRef.current
    if (!sentinel || !root) return

    const observer = new IntersectionObserver(
      (observerEntries) => {
        const entry = observerEntries[0]
        if (!entry?.isIntersecting) return
        if (loadingMoreRef.current) return
        if (page >= totalPages) return

        const nextPage = page + 1
        const requestId = ++requestIdRef.current
        loadingMoreRef.current = true
        setIsLoadingMore(true)

        const previousScrollHeight = root.scrollHeight

        void listWorkflowActivity(workflowId, {
          page: nextPage,
          limit: PAGE_LIMIT,
        })
          .then((result) => {
            if (requestId !== requestIdRef.current) return

            setEntries((current) => mergeOlderEntries(current, result.members))
            setPage(result.page)
            setTotalPages(result.totalPages)

            requestAnimationFrame(() => {
              const nextScrollHeight = root.scrollHeight
              root.scrollTop += nextScrollHeight - previousScrollHeight
            })
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
      { root, rootMargin: "80px", threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [workflowId, page, totalPages])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background text-sm shadow-sm">
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {isLoadingMore ? (
          <div className="flex items-center justify-center gap-2 border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" />
            Loading older events…
          </div>
        ) : null}

        <div ref={topSentinelRef} className="h-px shrink-0" aria-hidden />

        {isLoading ? (
          <div className="space-y-2 px-3 py-3">
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full rounded" />
            ))}
          </div>
        ) : hasError ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Failed to load activity logs.
          </div>
        ) : entries.length === 0 ? (
          <div className="px-4 py-10">
            <EmptyComponent
              title="No activity yet"
              description="Workflow events will appear here as they happen."
              icon={<ScrollTextIcon className="size-5 text-muted-foreground" />}
            />
          </div>
        ) : (
          <ul>
            {entries.map((item) => {
              const open = !!expanded[item.id]

              return (
                <li
                  key={item.id}
                  className="border-t border-border/60 first:border-t-0"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((state) => ({
                        ...state,
                        [item.id]: !state[item.id],
                      }))
                    }
                    className="flex w-full items-start gap-3 px-3 py-1.5 text-left hover:bg-accent/50"
                  >
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {formatActivityTime(item.occurredAt)}
                    </span>
                    <span
                      className={cn(
                        "w-12 shrink-0 uppercase",
                        getActivityLevelClass(item.level)
                      )}
                    >
                      {item.level}
                    </span>
                    <span className="min-w-0 flex-1 wrap-break-word text-foreground">
                      {item.message}
                    </span>
                  </button>

                  {open ? (
                    <pre className="overflow-x-auto border-t border-border/60 bg-muted px-3 py-2 text-[11px] text-muted-foreground">
                      {JSON.stringify(getActivityEntryDetails(item), null, 2)}
                    </pre>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
