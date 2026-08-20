"use client"

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { getWorkflowRun } from "@/lib/workflow-run/api"
import { WorkflowRun } from "@/lib/workflow-run/types"
import { useEffect, useState } from "react"

interface WorkflowRunDrawerProps {
  run: WorkflowRun | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkflowRunDrawer({
  run,
  isOpen,
  onOpenChange,
}: WorkflowRunDrawerProps) {
  const [detailedRun, setDetailedRun] = useState<WorkflowRun | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !run) {
      setDetailedRun(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setDetailedRun(run)
    setIsLoading(true)
    setError(null)

    void getWorkflowRun(run.id)
      .then((full) => {
        if (cancelled) return
        setDetailedRun(full)
      })
      .catch(() => {
        if (cancelled) return
        setError("Failed to load workflow run")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, run])

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
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
