"use client"

import { useEndpoint } from "@/lib/endpoint/context"
import { useOrganization } from "@/lib/organization/context"
import { useUser } from "@/lib/user/context"
import { useWorkflow } from "@/lib/workflow/context"
import { useCallback, useEffect, useRef } from "react"
import {
  isUserLifecycleEvent,
  isUserStreamEvent,
  shouldRefetchAllEndpoints,
  shouldRefetchOrganizations,
  shouldRefetchSingleEndpoint,
  shouldRefetchWorkflows,
} from "./types"
import { useCentrifuge } from "./use-centrifuge"

const REFRESH_DEBOUNCE_MS = 500

export function UserCentrifugeListener() {
  const { user, fetchUser } = useUser()
  const { fetchOrganizations } = useOrganization()
  const { fetchWorkflows } = useWorkflow()
  const {
    fetchEndpoints,
    fetchEndpoint,
    editingEndpointId,
  } = useEndpoint()

  const fetchUserRef = useRef(fetchUser)
  const fetchOrganizationsRef = useRef(fetchOrganizations)
  const fetchWorkflowsRef = useRef(fetchWorkflows)
  const fetchEndpointsRef = useRef(fetchEndpoints)
  const fetchEndpointRef = useRef(fetchEndpoint)
  const editingEndpointIdRef = useRef(editingEndpointId)
  const orgDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )
  const workflowDebounceRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined)
  const endpointDebounceRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined)

  useEffect(() => {
    fetchUserRef.current = fetchUser
    fetchOrganizationsRef.current = fetchOrganizations
    fetchWorkflowsRef.current = fetchWorkflows
    fetchEndpointsRef.current = fetchEndpoints
    fetchEndpointRef.current = fetchEndpoint
    editingEndpointIdRef.current = editingEndpointId
  }, [
    fetchUser,
    fetchOrganizations,
    fetchWorkflows,
    fetchEndpoints,
    fetchEndpoint,
    editingEndpointId,
  ])

  const debouncedRefreshOrganizations = useCallback(() => {
    if (orgDebounceRef.current) clearTimeout(orgDebounceRef.current)
    orgDebounceRef.current = setTimeout(() => {
      void fetchOrganizationsRef.current()
    }, REFRESH_DEBOUNCE_MS)
  }, [])

  const debouncedRefreshWorkflows = useCallback(() => {
    if (workflowDebounceRef.current) clearTimeout(workflowDebounceRef.current)
    workflowDebounceRef.current = setTimeout(() => {
      void fetchWorkflowsRef.current()
    }, REFRESH_DEBOUNCE_MS)
  }, [])

  const debouncedRefreshEndpoints = useCallback(() => {
    if (endpointDebounceRef.current) clearTimeout(endpointDebounceRef.current)
    endpointDebounceRef.current = setTimeout(() => {
      void fetchEndpointsRef.current()
    }, REFRESH_DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (orgDebounceRef.current) clearTimeout(orgDebounceRef.current)
      if (workflowDebounceRef.current) clearTimeout(workflowDebounceRef.current)
      if (endpointDebounceRef.current) clearTimeout(endpointDebounceRef.current)
    }
  }, [])

  const handlePublication = useCallback(
    (data: unknown) => {
      if (!isUserStreamEvent(data)) {
        console.warn("[Centrifugo] ignored publication (unknown type)", data)
        return
      }

      if (shouldRefetchOrganizations(data)) {
        debouncedRefreshOrganizations()
      }

      if (shouldRefetchWorkflows(data)) {
        debouncedRefreshWorkflows()
      }

      if (shouldRefetchAllEndpoints(data)) {
        debouncedRefreshEndpoints()
      }

      if (shouldRefetchSingleEndpoint(data)) {
        const endpointId = data.endpointId
        if (
          endpointId &&
          editingEndpointIdRef.current === endpointId
        ) {
          void fetchEndpointRef.current(endpointId)
        } else {
          debouncedRefreshEndpoints()
        }
      }

      if (isUserLifecycleEvent(data)) {
        void fetchUserRef.current()
      }
    },
    [
      debouncedRefreshOrganizations,
      debouncedRefreshWorkflows,
      debouncedRefreshEndpoints,
    ]
  )

  const enabled = Boolean(user?.id)

  useCentrifuge(enabled, handlePublication)

  return null
}
