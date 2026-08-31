"use client"

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { WorkflowActivityLog } from "@/components/workflow/workflow-activity-log"
import { ScrollTextIcon } from "lucide-react"
import { useRef } from "react"

interface WorkflowActivityDrawerProps {
  workflowId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkflowActivityDrawer({
  workflowId,
  isOpen,
  onOpenChange,
}: WorkflowActivityDrawerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="flex h-full w-[40vw]! max-w-[40vw]! flex-col">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Activity</DrawerTitle>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b px-6 py-6">
            <div className="flex items-center gap-2">
              <ScrollTextIcon className="size-4 text-muted-foreground" />
              <div className="min-w-0 space-y-1">
                <h2 className="text-base font-semibold">Activity</h2>
                <p className="text-sm text-muted-foreground">
                  Workflow events and audit log
                </p>
              </div>
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 overflow-auto px-6 py-4"
          >
            {isOpen ? (
              <WorkflowActivityLog
                workflowId={workflowId}
                scrollContainerRef={scrollContainerRef}
              />
            ) : null}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
