"use client"

import { initPaginate, PaginateQuery } from "@/lib/paginate"
import { useOrganization } from "@/lib/organization/context"
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
  const { activeOrganization } = useOrganization()
  const bootstrappedOrgIdRef = useRef<string | null>(null)

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

  // Bootstrap once when an active org first appears.
  // Org switches are refreshed by Centrifugo (`user.active_organization_changed`).
  useEffect(() => {
    const orgId = activeOrganization?.id ?? null

    if (!orgId) {
      bootstrappedOrgIdRef.current = null
      dispatch({ type: "GET_WORKFLOWS", payload: initPaginate() })
      return
    }

    if (bootstrappedOrgIdRef.current === orgId) return

    const isFirstBootstrap = bootstrappedOrgIdRef.current === null
    bootstrappedOrgIdRef.current = orgId

    if (isFirstBootstrap) {
      void fetchWorkflows()
      return
    }

    // Org switched: clear stale list; Centrifugo will refill.
    dispatch({ type: "GET_WORKFLOWS", payload: initPaginate() })
  }, [activeOrganization?.id, fetchWorkflows])

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
