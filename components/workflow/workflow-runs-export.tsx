"use client"

import { DateTimePicker } from "@/components/date-time-picker"
import { openSubscriptionDrawer } from "@/components/subscription-drawer-host"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useQuota } from "@/lib/quota/context"
import { useOptionalSubscription } from "@/lib/subscription/context"
import {
  startWorkflowRunsExport,
  WorkflowRunsExportError,
} from "@/lib/workflow-run/api"
import { subscribeRunExportUpdate } from "@/lib/workflow-run/export-realtime"
import { eventTypeEquals } from "@/lib/centrifugo/types"
import { useClerk } from "@clerk/nextjs"
import { FileSpreadsheetIcon, Loader2Icon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

interface WorkflowRunsExportProps {
  workflowId: string
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}

function datetimeLocalToRfc3339(value: string): string | undefined {
  if (!value.trim()) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

function clampRfc3339(iso: string, min: Date, max: Date): string {
  const date = new Date(iso)
  if (date < min) return min.toISOString()
  if (date > max) return max.toISOString()
  return iso
}

export function WorkflowRunsExport({ workflowId }: WorkflowRunsExportProps) {
  const { quota } = useQuota()
  const subscriptionContext = useOptionalSubscription()
  const { redirectToSignIn } = useClerk()
  const abortRef = useRef<AbortController | null>(null)
  const pendingJobIdRef = useRef<string | null>(null)

  const allowsDataExport =
    quota?.limits?.allowsDataExport ??
    subscriptionContext?.subscription?.plan?.quota?.allowsDataExport ??
    false
  const retentionDays =
    quota?.limits?.runHistoryRetentionDays ??
    subscriptionContext?.subscription?.plan?.quota?.runHistoryRetentionDays ??
    7

  const { minDate, maxDate } = useMemo(() => {
    const max = new Date()
    const min = new Date(max.getTime() - retentionDays * 24 * 60 * 60 * 1000)
    return { minDate: min, maxDate: max }
  }, [retentionDays])

  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    return subscribeRunExportUpdate((event) => {
      const pendingJobId = pendingJobIdRef.current
      if (!pendingJobId) return
      if (event.runExportId && event.runExportId !== pendingJobId) return
      if (event.workflowId && event.workflowId !== workflowId) return
      if (
        !eventTypeEquals(event, "runExport.ready") &&
        !eventTypeEquals(event, "runExport.failed")
      ) {
        return
      }

      pendingJobIdRef.current = null
      setIsExporting(false)
    })
  }, [workflowId])

  const handleExport = async () => {
    if (!allowsDataExport || isExporting) return

    const fromIso = datetimeLocalToRfc3339(from)
    const toIso = datetimeLocalToRfc3339(to)

    if ((from.trim() && !fromIso) || (to.trim() && !toIso)) {
      const message = "Invalid request body"
      setRangeError(message)
      toast.error(message)
      return
    }

    const clampedFrom = fromIso
      ? clampRfc3339(fromIso, minDate, maxDate)
      : undefined
    const clampedTo = toIso ? clampRfc3339(toIso, minDate, maxDate) : undefined

    if (clampedFrom && clampedTo && clampedFrom > clampedTo) {
      const message = "invalid export date range"
      setRangeError(message)
      toast.error(message)
      return
    }

    setRangeError(null)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setIsExporting(true)
    setOpen(false)

    try {
      const job = await startWorkflowRunsExport(
        workflowId,
        {
          from: clampedFrom,
          to: clampedTo,
        },
        controller.signal
      )
      pendingJobIdRef.current = job.id
      toast.success(
        "Export started. You'll receive an email with the Excel file."
      )
    } catch (error) {
      pendingJobIdRef.current = null
      setIsExporting(false)

      if (isAbortError(error)) return

      if (error instanceof WorkflowRunsExportError) {
        if (
          error.kind === "invalid_range" ||
          error.kind === "invalid_body"
        ) {
          setRangeError(error.message)
          setOpen(true)
        }

        toast.error(error.message)

        if (error.kind === "unauthorized") {
          void redirectToSignIn()
        }

        if (error.kind === "forbidden") {
          openSubscriptionDrawer()
        }

        return
      }

      toast.error(
        error instanceof Error ? error.message : "Failed to export workflow runs"
      )
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
    }
  }

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={isExporting || !allowsDataExport}
      aria-label="Export runs"
      className={
        allowsDataExport ? undefined : "pointer-events-none"
      }
    >
      {isExporting ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <FileSpreadsheetIcon className="size-3.5" />
      )}
      Export
    </Button>
  )

  if (!allowsDataExport) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="inline-flex cursor-pointer"
              onClick={() => openSubscriptionDrawer()}
            >
              {triggerButton}
            </span>
          </TooltipTrigger>
          <TooltipContent>Disponible à partir de Pro</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent align="end" className="w-96 gap-3 p-3">
        <DateTimePicker
          id="workflow-runs-export-from"
          label="From"
          value={from}
          onChange={(value) => {
            setFrom(value)
            setRangeError(null)
          }}
          disabled={isExporting}
          minDate={minDate}
          maxDate={maxDate}
          hasError={Boolean(rangeError)}
        />
        <DateTimePicker
          id="workflow-runs-export-to"
          label="To"
          value={to}
          onChange={(value) => {
            setTo(value)
            setRangeError(null)
          }}
          disabled={isExporting}
          minDate={minDate}
          maxDate={maxDate}
          hasError={Boolean(rangeError)}
          errorMessage={rangeError ?? undefined}
        />
        <p className="text-xs text-muted-foreground">
          Limited to the last {retentionDays} days of run history. Leave empty
          to export the full window.
        </p>
        <Button
          type="button"
          size="lg"
          disabled={isExporting}
          onClick={() => {
            void handleExport()
          }}
        >
          {isExporting ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <FileSpreadsheetIcon className="size-3.5" />
          )}
          Export runs
        </Button>
      </PopoverContent>
    </Popover>
  )
}
