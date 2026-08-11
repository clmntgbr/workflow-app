"use client"

import { initPaginate, PaginateQuery } from "@/lib/paginate"
import { useOrganization } from "@/lib/organization/context"
import { useCallback, useEffect, useReducer } from "react"
import {
  createWorkflow as createWorkflowRequest,
  deleteWorkflow as deleteWorkflowRequest,
  listWorkflows,
  updateWorkflow as updateWorkflowRequest,
} from "./api"
import { WorkflowContext } from "./context"
import { workflowReducer } from "./reducer"
import {
  CreateWorkflowInput,
  initialWorkflowState,
  UpdateWorkflowInput,
} from "./types"

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(workflowReducer, initialWorkflowState)
  const { activeOrganization } = useOrganization()

  const fetchWorkflows = useCallback(
    async (query?: PaginateQuery) => {
      if (!activeOrganization?.id) {
        dispatch({
          type: "GET_WORKFLOWS",
          payload: initPaginate(),
        })
        return
      }

      try {
        dispatch({ type: "GET_WORKFLOWS_LOADING", payload: true })
        const workflows = await listWorkflows(query)
        dispatch({ type: "GET_WORKFLOWS", payload: workflows })
      } catch {
        dispatch({
          type: "GET_WORKFLOWS_ERROR",
          payload: "Failed to fetch workflows",
        })
      } finally {
        dispatch({ type: "GET_WORKFLOWS_LOADING", payload: false })
      }
    },
    [activeOrganization?.id]
  )

  // Mutations only — list refresh comes from Centrifugo / org change.
  const createWorkflow = useCallback(async (input: CreateWorkflowInput) => {
    return createWorkflowRequest(input)
  }, [])

  const updateWorkflow = useCallback(
    async (id: string, input: UpdateWorkflowInput) => {
      const workflow = await updateWorkflowRequest(id, input)
      dispatch({ type: "UPSERT_WORKFLOW", payload: workflow })
      return workflow
    },
    []
  )

  const removeWorkflow = useCallback(async (id: string) => {
    await deleteWorkflowRequest(id)
    dispatch({ type: "REMOVE_WORKFLOW", payload: id })
  }, [])

  useEffect(() => {
    void fetchWorkflows()
  }, [fetchWorkflows])

  return (
    <WorkflowContext.Provider
      value={{
        ...state,
        fetchWorkflows,
        createWorkflow,
        updateWorkflow,
        removeWorkflow,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  )
}
