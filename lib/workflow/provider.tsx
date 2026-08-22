"use client"

import { initPaginate, PaginateQuery } from "@/lib/paginate"
import { useProject } from "@/lib/project/context"
import { useCallback, useEffect, useReducer, useRef } from "react"
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
  const { activeProject } = useProject()
  const bootstrappedProjectIdRef = useRef<string | null>(null)

  const fetchWorkflows = useCallback(
    async (query?: PaginateQuery) => {
      if (!activeProject?.id) {
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
    [activeProject?.id]
  )

  // Mutations only — list refresh comes from Centrifugo.
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

  // Bootstrap once when an active project first appears.
  // Project switches are refreshed by Centrifugo (`user.active_project_changed`).
  useEffect(() => {
    const projectId = activeProject?.id ?? null

    if (!projectId) {
      bootstrappedProjectIdRef.current = null
      dispatch({ type: "GET_WORKFLOWS", payload: initPaginate() })
      return
    }

    if (bootstrappedProjectIdRef.current === projectId) return

    const isFirstBootstrap = bootstrappedProjectIdRef.current === null
    bootstrappedProjectIdRef.current = projectId

    if (isFirstBootstrap) {
      void fetchWorkflows()
      return
    }

    // Project switched: clear stale list; Centrifugo will refill.
    dispatch({ type: "GET_WORKFLOWS", payload: initPaginate() })
  }, [activeProject?.id, fetchWorkflows])

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
