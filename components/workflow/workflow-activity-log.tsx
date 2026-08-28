"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { subscribeWorkflowActivityRefetch } from "@/lib/workflow/activity/activity-realtime"
import { listWorkflowActivity } from "@/lib/workflow/activity/api"
import {
  formatActivityTime,
  getActivityLevelClassDark,
  WorkflowActivityEntry,
} from "@/lib/workflow/activity/types"
import { Loader2Icon, ScrollTextIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

const PAGE_LIMIT = 20

function mergeOlderEntries(
  current: WorkflowActivityEntry[],
  olderPage: WorkflowActivityEntry[]
): WorkflowActivityEntry[] {
  const seen = new Set(current.map((entry) => entry.id))
  const appended = olderPage.filter((entry) => !seen.has(entry.id))
  return [...current, ...appended]
}

function prependNewEntries(
  current: WorkflowActivityEntry[],
  freshPage: WorkflowActivityEntry[]
): WorkflowActivityEntry[] {
  const seen = new Set(current.map((entry) => entry.id))
  const newOnes = freshPage.filter((entry) => !seen.has(entry.id))
  if (newOnes.length === 0) return current
  return [...newOnes, ...current]
}

function getScrollParent(element: HTMLElement | null): HTMLElement {
  if (!element) return document.documentElement

  let parent = element.parentElement
  while (parent) {
    const { overflowY } = getComputedStyle(parent)
    if (overflowY === "auto" || overflowY === "scroll") return parent
    parent = parent.parentElement
  }

  return document.documentElement
}

function getScrollTop(element: HTMLElement): number {
  return element === document.documentElement
    ? window.scrollY
    : element.scrollTop
}

function setScrollTop(element: HTMLElement, value: number): void {
  if (element === document.documentElement) {
    window.scrollTo(0, value)
    return
  }
  element.scrollTop = value
}

function getScrollHeight(element: HTMLElement): number {
  return element === document.documentElement
    ? document.documentElement.scrollHeight
    : element.scrollHeight
}

interface WorkflowActivityLogProps {
  workflowId: string
}

function ActivityLogShell({
  children,
  className,
  scrollRef,
}: {
  children: React.ReactNode
  className?: string
  scrollRef?: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-700 bg-slate-900 font-mono text-sm shadow-none",
        className
      )}
    >
      <div className="flex items-center border-b border-slate-700 bg-slate-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-rose-500" />
          <div className="size-3 rounded-full bg-amber-500" />
          <div className="size-3 rounded-full bg-emerald-500" />
        </div>
      </div>
      <div
        ref={scrollRef}
        className="min-h-[min(70vh,720px)] overflow-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#334155 transparent",
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function WorkflowActivityLog({ workflowId }: WorkflowActivityLogProps) {
  const requestIdRef = useRef(0)
  const loadingMoreRef = useRef(false)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [entries, setEntries] = useState<WorkflowActivityEntry[]>([])
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
        setIsLoading(true)
        setHasError(false)
      }

      try {
        const result = await listWorkflowActivity(workflowId, {
          page: 1,
          limit: PAGE_LIMIT,
        })
        if (requestId !== requestIdRef.current) return

        if (options?.silent) {
          const scrollParent =
            scrollContainerRef.current ??
            getScrollParent(bottomSentinelRef.current)
          const previousScrollHeight = getScrollHeight(scrollParent)
          const previousScrollTop = getScrollTop(scrollParent)

          setEntries((current) => prependNewEntries(current, result.members))

          requestAnimationFrame(() => {
            const nextScrollHeight = getScrollHeight(scrollParent)
            setScrollTop(
              scrollParent,
              previousScrollTop + (nextScrollHeight - previousScrollHeight)
            )
          })
        } else {
          setEntries(result.members)
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
    if (page >= totalPages || totalPages === 0) return

    const sentinel = bottomSentinelRef.current
    if (!sentinel) return

    const scrollParent = scrollContainerRef.current ?? getScrollParent(sentinel)

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

        void listWorkflowActivity(workflowId, {
          page: nextPage,
          limit: PAGE_LIMIT,
        })
          .then((result) => {
            if (requestId !== requestIdRef.current) return

            setEntries((current) => mergeOlderEntries(current, result.members))
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
      {
        root: scrollParent === document.documentElement ? null : scrollParent,
        rootMargin: "80px",
        threshold: 0,
      }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [workflowId, page, totalPages])

  if (isLoading && entries.length === 0) {
    return (
      <div className="pb-7">
        <ActivityLogShell>
          <div className="space-y-2 px-6 py-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-8 w-full rounded bg-slate-800"
              />
            ))}
          </div>
        </ActivityLogShell>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="pb-7">
        <ActivityLogShell>
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            Failed to load activity logs.
          </p>
        </ActivityLogShell>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="pb-7">
        <ActivityLogShell>
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <ScrollTextIcon className="mb-3 size-8 text-slate-600" />
            <p className="text-sm font-medium text-slate-300">
              No activity yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Workflow events will appear here as they happen.
            </p>
          </div>
        </ActivityLogShell>
      </div>
    )
  }

  return (
    <div className="pb-7">
      <ActivityLogShell scrollRef={scrollContainerRef}>
        <ul>
          {entries.map((item) => (
            <li
              key={item.id}
              className="border-t border-slate-800 px-6 first:border-t-0"
            >
              <div className="flex w-full items-start gap-3 px-4 py-1.5">
                <span className="shrink-0 text-slate-500 tabular-nums">
                  {formatActivityTime(item.occurredAt)}
                </span>
                <span
                  className={cn(
                    "w-12 shrink-0 uppercase",
                    getActivityLevelClassDark(item.level)
                  )}
                >
                  {item.level}
                </span>
                <span className="w-56 shrink-0 truncate text-slate-400">
                  {item.action}
                </span>
                <span className="min-w-0 flex-1 wrap-break-word text-slate-100">
                  {item.message}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {isLoadingMore ? (
          <div className="flex items-center justify-center gap-2 border-t border-slate-800 px-3 py-2 text-xs text-slate-500">
            <Loader2Icon className="size-3.5 animate-spin" />
            Loading older events…
          </div>
        ) : null}

        <div ref={bottomSentinelRef} className="h-px shrink-0" aria-hidden />
      </ActivityLogShell>
    </div>
  )
}
