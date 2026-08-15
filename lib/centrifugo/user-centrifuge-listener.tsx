"use client"

import { useEndpoint } from "@/lib/endpoint/context"
import { useOrganization } from "@/lib/organization/context"
import { useUser } from "@/lib/user/context"
import { useWorkflow } from "@/lib/workflow/context"
import { notifyWorkflowConnectionsRefetch } from "@/lib/workflow/connection-realtime"
import { notifyWorkflowStepsRefetch } from "@/lib/workflow/step-realtime"
import { notifyWorkflowVariablesRefetch } from "@/lib/workflow/variable/variable-realtime"
import { notifyWorkflowDetailRefetch } from "@/lib/workflow/workflow-realtime"
import { notifyWorkflowRunsRefetch } from "@/lib/workflow-run/run-realtime"
import { useCallback, useEffect, useRef } from "react"
import {
  isUserLifecycleEvent,
  isUserStreamEvent,
  shouldRefetchAllEndpoints,
  shouldRefetchConnections,
  shouldRefetchOrganizations,
  shouldRefetchSingleEndpoint,
  shouldRefetchSteps,
  shouldRefetchVariables,
  shouldRefetchWorkflowDetail,
  shouldRefetchWorkflowRuns,
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
  const stepDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )
  const connectionDebounceRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined)
  const workflowRunDebounceRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined)
  const variableDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )
  const pendingStepWorkflowIdsRef = useRef<Set<string>>(new Set())
  const pendingConnectionWorkflowIdsRef = useRef<Set<string>>(new Set())
  const pendingWorkflowRunWorkflowIdsRef = useRef<Set<string>>(new Set())
  const pendingVariableWorkflowIdsRef = useRef<Set<string>>(new Set())

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

  const debouncedRefreshSteps = useCallback((workflowId?: string) => {
    if (workflowId) {
      pendingStepWorkflowIdsRef.current.add(workflowId)
    } else {
      pendingStepWorkflowIdsRef.current.clear()
      pendingStepWorkflowIdsRef.current.add("*")
    }

    if (stepDebounceRef.current) clearTimeout(stepDebounceRef.current)
    stepDebounceRef.current = setTimeout(() => {
      const workflowIds = Array.from(pendingStepWorkflowIdsRef.current)
      pendingStepWorkflowIdsRef.current.clear()

      if (workflowIds.includes("*")) {
        notifyWorkflowStepsRefetch()
        return
      }

      for (const id of workflowIds) {
        notifyWorkflowStepsRefetch(id)
      }
    }, REFRESH_DEBOUNCE_MS)
  }, [])

  const debouncedRefreshConnections = useCallback((workflowId?: string) => {
    if (workflowId) {
      pendingConnectionWorkflowIdsRef.current.add(workflowId)
    } else {
      pendingConnectionWorkflowIdsRef.current.clear()
      pendingConnectionWorkflowIdsRef.current.add("*")
    }

    if (connectionDebounceRef.current) {
      clearTimeout(connectionDebounceRef.current)
    }
    connectionDebounceRef.current = setTimeout(() => {
      const workflowIds = Array.from(pendingConnectionWorkflowIdsRef.current)
      pendingConnectionWorkflowIdsRef.current.clear()

      if (workflowIds.includes("*")) {
        notifyWorkflowConnectionsRefetch()
        return
      }

      for (const id of workflowIds) {
        notifyWorkflowConnectionsRefetch(id)
      }
    }, REFRESH_DEBOUNCE_MS)
  }, [])

  const debouncedRefreshWorkflowRuns = useCallback((workflowId?: string) => {
    if (workflowId) {
      pendingWorkflowRunWorkflowIdsRef.current.add(workflowId)
    } else {
      pendingWorkflowRunWorkflowIdsRef.current.clear()
      pendingWorkflowRunWorkflowIdsRef.current.add("*")
    }

    if (workflowRunDebounceRef.current) {
      clearTimeout(workflowRunDebounceRef.current)
    }
    workflowRunDebounceRef.current = setTimeout(() => {
      const workflowIds = Array.from(pendingWorkflowRunWorkflowIdsRef.current)
      pendingWorkflowRunWorkflowIdsRef.current.clear()

      if (workflowIds.includes("*")) {
        notifyWorkflowRunsRefetch()
        return
      }

      for (const id of workflowIds) {
        notifyWorkflowRunsRefetch(id)
      }
    }, REFRESH_DEBOUNCE_MS)
  }, [])

  const debouncedRefreshVariables = useCallback((workflowId?: string) => {
    if (workflowId) {
      pendingVariableWorkflowIdsRef.current.add(workflowId)
    } else {
      pendingVariableWorkflowIdsRef.current.clear()
      pendingVariableWorkflowIdsRef.current.add("*")
    }

    if (variableDebounceRef.current) {
      clearTimeout(variableDebounceRef.current)
    }
    variableDebounceRef.current = setTimeout(() => {
      const workflowIds = Array.from(pendingVariableWorkflowIdsRef.current)
      pendingVariableWorkflowIdsRef.current.clear()

      if (workflowIds.includes("*")) {
        notifyWorkflowVariablesRefetch()
        return
      }

      for (const id of workflowIds) {
        notifyWorkflowVariablesRefetch(id)
      }
    }, REFRESH_DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (orgDebounceRef.current) clearTimeout(orgDebounceRef.current)
      if (workflowDebounceRef.current) clearTimeout(workflowDebounceRef.current)
      if (endpointDebounceRef.current) clearTimeout(endpointDebounceRef.current)
      if (stepDebounceRef.current) clearTimeout(stepDebounceRef.current)
      if (connectionDebounceRef.current) {
        clearTimeout(connectionDebounceRef.current)
      }
      if (workflowRunDebounceRef.current) {
        clearTimeout(workflowRunDebounceRef.current)
      }
      if (variableDebounceRef.current) {
        clearTimeout(variableDebounceRef.current)
      }
    }
  }, [])

  const handlePublication = useCallback(
    (data: unknown) => {
      if (!isUserStreamEvent(data)) {
        console.warn("[Centrifugo] ignored publication (unknown type)", data)
        return
      }

      console.log("[Centrifugo] event received", {
        type: data.type,
        workflowId: data.workflowId,
        workflowRunId: data.workflowRunId,
        stepId: data.stepId,
        stepRunId: data.stepRunId,
        endpointId: data.endpointId,
        organizationId: data.organizationId,
        userId: data.userId,
        payload: data,
      })

      if (shouldRefetchOrganizations(data)) {
        debouncedRefreshOrganizations()
      }

      if (shouldRefetchWorkflows(data)) {
        debouncedRefreshWorkflows()
      }

      if (shouldRefetchWorkflowDetail(data)) {
        notifyWorkflowDetailRefetch(data.workflowId)
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

      if (shouldRefetchSteps(data)) {
        debouncedRefreshSteps(data.workflowId)
      }

      if (shouldRefetchConnections(data)) {
        debouncedRefreshConnections(data.workflowId)
      }

      if (shouldRefetchWorkflowRuns(data)) {
        debouncedRefreshWorkflowRuns(data.workflowId)
      }

      if (shouldRefetchVariables(data)) {
        debouncedRefreshVariables(data.workflowId)
      }

      if (isUserLifecycleEvent(data)) {
        void fetchUserRef.current()
      }
    },
    [
      debouncedRefreshOrganizations,
      debouncedRefreshWorkflows,
      debouncedRefreshEndpoints,
      debouncedRefreshSteps,
      debouncedRefreshConnections,
      debouncedRefreshWorkflowRuns,
      debouncedRefreshVariables,
    ]
  )

  const enabled = Boolean(user?.id)

  useCentrifuge(enabled, handlePublication)

  return null
}
