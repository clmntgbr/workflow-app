"use client"

import { PaginateQuery } from "@/lib/paginate"
import { createContext, useContext } from "react"
import {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  Workflow,
  WorkflowState,
} from "./types"

export interface WorkflowContextType extends WorkflowState {
  fetchWorkflows: (query?: PaginateQuery) => Promise<void>
  createWorkflow: (input: CreateWorkflowInput) => Promise<Workflow>
  updateWorkflow: (id: string, input: UpdateWorkflowInput) => Promise<Workflow>
  removeWorkflow: (id: string) => Promise<void>
}

export const WorkflowContext = createContext<WorkflowContextType | undefined>(
  undefined
)

export const useWorkflow = () => {
  const context = useContext(WorkflowContext)
  if (!context) {
    throw new Error("useWorkflow must be used within WorkflowProvider")
  }
  return context
}
