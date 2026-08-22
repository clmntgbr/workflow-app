"use client"

import { initPaginate, PaginateQuery } from "@/lib/paginate"
import { useProject } from "@/lib/project/context"
import { useCallback, useEffect, useReducer, useRef } from "react"
import {
  createEndpoint as createEndpointRequest,
  deleteEndpoint as deleteEndpointRequest,
  getEndpoint,
  listEndpoints,
  updateEndpoint as updateEndpointRequest,
} from "./api"
import { EndpointContext } from "./context"
import { endpointReducer } from "./reducer"
import {
  CreateEndpointInput,
  initialEndpointState,
  UpdateEndpointInput,
} from "./types"

export function EndpointProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(endpointReducer, initialEndpointState)
  const { activeProject } = useProject()
  const bootstrappedProjectIdRef = useRef<string | null>(null)
  const lastQueryRef = useRef<PaginateQuery | undefined>(undefined)

  const fetchEndpoints = useCallback(
    async (query?: PaginateQuery) => {
      if (!activeProject?.id) {
        dispatch({
          type: "GET_ENDPOINTS",
          payload: initPaginate(),
        })
        return
      }

      if (query !== undefined) {
        lastQueryRef.current = query
      }

      const effectiveQuery = query ?? lastQueryRef.current

      try {
        dispatch({ type: "GET_ENDPOINTS_LOADING", payload: true })
        const endpoints = await listEndpoints(effectiveQuery)
        dispatch({ type: "GET_ENDPOINTS", payload: endpoints })
      } catch {
        dispatch({
          type: "GET_ENDPOINTS_ERROR",
          payload: "Failed to fetch endpoints",
        })
      } finally {
        dispatch({ type: "GET_ENDPOINTS_LOADING", payload: false })
      }
    },
    [activeProject?.id]
  )

  const fetchEndpoint = useCallback(async (id: string) => {
    const endpoint = await getEndpoint(id)
    dispatch({ type: "UPSERT_ENDPOINT", payload: endpoint })
    return endpoint
  }, [])

  const createEndpoint = useCallback(async (input: CreateEndpointInput) => {
    return createEndpointRequest(input)
  }, [])

  const updateEndpoint = useCallback(
    async (id: string, input: UpdateEndpointInput) => {
      const endpoint = await updateEndpointRequest(id, input)
      dispatch({ type: "UPSERT_ENDPOINT", payload: endpoint })
      return endpoint
    },
    []
  )

  const removeEndpoint = useCallback(async (id: string) => {
    await deleteEndpointRequest(id)
    dispatch({ type: "REMOVE_ENDPOINT", payload: id })
  }, [])

  const setEditingEndpointId = useCallback((id: string | null) => {
    dispatch({ type: "SET_EDITING_ENDPOINT_ID", payload: id })
  }, [])

  // Bootstrap once when an active project first appears.
  // Project switches are refreshed by Centrifugo (`user.active_project_changed`).
  useEffect(() => {
    const projectId = activeProject?.id ?? null

    if (!projectId) {
      bootstrappedProjectIdRef.current = null
      lastQueryRef.current = undefined
      dispatch({ type: "GET_ENDPOINTS", payload: initPaginate() })
      return
    }

    if (bootstrappedProjectIdRef.current === projectId) return

    const isFirstBootstrap = bootstrappedProjectIdRef.current === null
    bootstrappedProjectIdRef.current = projectId

    if (isFirstBootstrap) {
      void fetchEndpoints()
      return
    }

    // Project switched: clear stale list; Centrifugo will refill.
    lastQueryRef.current = undefined
    dispatch({ type: "GET_ENDPOINTS", payload: initPaginate() })
  }, [activeProject?.id, fetchEndpoints])

  return (
    <EndpointContext.Provider
      value={{
        ...state,
        fetchEndpoints,
        fetchEndpoint,
        createEndpoint,
        updateEndpoint,
        removeEndpoint,
        setEditingEndpointId,
      }}
    >
      {children}
    </EndpointContext.Provider>
  )
}
