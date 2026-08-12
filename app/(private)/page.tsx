"use client"

import { WorkflowList } from "@/components/workflow/workflow-list"
import { EndpointList } from "@/components/endpoint/endpoint-list"

export default function Page() {
  return (
    <>
      <WorkflowList />
      <EndpointList />
    </>
  )
}
