"use client"

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { getWorkflowRun } from "@/lib/workflow-run/api"
import { WorkflowRun, WorkflowRunDetail } from "@/lib/workflow-run/types"
import { useEffect, useState } from "react"

interface WorkflowRunDrawerProps {
  workflowId: string
  run: WorkflowRun | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkflowRunDrawer({
  workflowId,
  run,
  isOpen,
  onOpenChange,
}: WorkflowRunDrawerProps) {
  const [detailedRun, setDetailedRun] = useState<WorkflowRunDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeRunId = isOpen && run ? run.id : null

  useEffect(() => {
    if (!activeRunId) {
      setDetailedRun(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      setDetailedRun(null)

      try {
        const full = await getWorkflowRun(workflowId, activeRunId)
        if (cancelled) return
        setDetailedRun(full)
      } catch {
        if (cancelled) return
        setError("Failed to load workflow run")
        setDetailedRun(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [activeRunId, workflowId])

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="flex h-full w-[80vw]! max-w-[80vw]! flex-col">
        <DrawerHeader className="sr-only">
          <DrawerTitle>
            {detailedRun
              ? `Workflow run ${detailedRun.id}`
              : run
                ? `Workflow run ${run.id}`
                : "Workflow run"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground">{error}</p>
          ) : detailedRun ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Run #{detailedRun.id.split("-")[0]}
              </p>
              <p className="text-sm text-muted-foreground">
                Status: {detailedRun.status}
              </p>
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
