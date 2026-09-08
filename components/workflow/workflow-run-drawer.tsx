"use client"

import { WorkflowRunStepRun } from "@/components/workflow/workflow-run-step-run"
import { WorkflowRunTimeline } from "@/components/workflow/workflow-run-timeline"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
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

  const activeRunId = isOpen && run ? run.id : null

  useEffect(() => {
    if (!activeRunId) return

    let cancelled = false

    const load = async () => {
      try {
        const full = await getWorkflowRun(workflowId, activeRunId)
        if (cancelled) return
        setDetailedRun(full)
      } catch {
        if (cancelled) return
        setDetailedRun(null)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [activeRunId, workflowId])

  const resolvedRun =
    detailedRun && run && detailedRun.id === run.id ? detailedRun : null
  const stepRuns = Array.isArray(resolvedRun?.stepRuns)
    ? resolvedRun.stepRuns
    : []
  const sortedStepRuns = [...stepRuns].sort(
    (left, right) => (left.executionOrder ?? 0) - (right.executionOrder ?? 0)
  )
  const timelineRun = resolvedRun ?? run

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

        <div className="min-h-0 flex-1 space-y-6 overflow-auto px-6 py-8">
          {timelineRun ? (
            <WorkflowRunTimeline run={timelineRun} stepRuns={sortedStepRuns} />
          ) : null}
          {sortedStepRuns.length > 0 ? (
            <div className="overflow-hidden rounded-lg border bg-card">
              {sortedStepRuns.map((stepRun, index) => (
                <WorkflowRunStepRun
                  key={stepRun.id}
                  stepRun={stepRun}
                  index={index}
                />
              ))}
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
