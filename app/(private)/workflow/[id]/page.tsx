"use client"

import { WorkflowPageClient } from "./workflow-page-client"
import { use } from "react"

interface WorkflowPageProps {
  params: Promise<{ id: string }>
}

export default function WorkflowIdPage({ params }: WorkflowPageProps) {
  const { id } = use(params)
  return <WorkflowPageClient workflowId={id} />
}
