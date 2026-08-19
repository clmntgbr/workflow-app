"use client"

import { WorkflowList } from "@/components/workflow/workflow-list"

export default function Page() {
  return (
    <div className="h-full overflow-auto">
      <WorkflowList />
    </div>
  )
}
