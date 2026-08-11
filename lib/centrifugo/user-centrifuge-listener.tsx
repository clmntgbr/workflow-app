"use client"

import { useOrganization } from "@/lib/organization/context"
import { useUser } from "@/lib/user/context"
import { useWorkflow } from "@/lib/workflow/context"
import { useCallback, useEffect, useRef } from "react"
import {
  isUserLifecycleEvent,
  isUserStreamEvent,
  shouldRefetchOrganizations,
  shouldRefetchWorkflows,
} from "./types"
import { useCentrifuge } from "./use-centrifuge"

const REFRESH_DEBOUNCE_MS = 500

export function UserCentrifugeListener() {
  const { user, fetchUser } = useUser()
  const { fetchOrganizations } = useOrganization()
  const { fetchWorkflows } = useWorkflow()

  const fetchUserRef = useRef(fetchUser)
  const fetchOrganizationsRef = useRef(fetchOrganizations)
  const fetchWorkflowsRef = useRef(fetchWorkflows)
  const orgDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )
  const workflowDebounceRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined)

  useEffect(() => {
    fetchUserRef.current = fetchUser
    fetchOrganizationsRef.current = fetchOrganizations
    fetchWorkflowsRef.current = fetchWorkflows
  }, [fetchUser, fetchOrganizations, fetchWorkflows])

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

  useEffect(() => {
    return () => {
      if (orgDebounceRef.current) clearTimeout(orgDebounceRef.current)
      if (workflowDebounceRef.current) clearTimeout(workflowDebounceRef.current)
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

      if (isUserLifecycleEvent(data)) {
        void fetchUserRef.current()
      }
    },
    [debouncedRefreshOrganizations, debouncedRefreshWorkflows]
  )

  // Keep the socket up across refetches — do not tie enabled to isLoading.
  const enabled = Boolean(user?.id)

  useCentrifuge(enabled, handlePublication)

  return null
}
