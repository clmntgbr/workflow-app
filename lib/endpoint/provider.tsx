"use client"

import { initPaginate, PaginateQuery } from "@/lib/paginate"
import { useOrganization } from "@/lib/organization/context"
import { useCallback, useEffect, useReducer } from "react"
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
  const { activeOrganization } = useOrganization()

  const fetchEndpoints = useCallback(
    async (query?: PaginateQuery) => {
      if (!activeOrganization?.id) {
        dispatch({
          type: "GET_ENDPOINTS",
          payload: initPaginate(),
        })
        return
      }

      try {
        dispatch({ type: "GET_ENDPOINTS_LOADING", payload: true })
        const endpoints = await listEndpoints(query)
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
    [activeOrganization?.id]
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

  useEffect(() => {
    void fetchEndpoints()
  }, [fetchEndpoints])

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
