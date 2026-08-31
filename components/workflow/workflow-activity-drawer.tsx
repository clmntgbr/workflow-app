"use client"

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { WorkflowActivityLog } from "@/components/workflow/workflow-activity-log"

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
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="flex h-full w-[40vw]! max-w-[40vw]! flex-col">
        <DrawerHeader className="sr-only">
          <DrawerTitle className="hidden">Activity</DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col p-0">
          {isOpen ? (
            <WorkflowActivityLog workflowId={workflowId} fillHeight />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
