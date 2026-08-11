"use client"

import { useOrganization } from "@/lib/organization/context"
import { useUser } from "@/lib/user/context"
import { useCallback, useEffect, useRef } from "react"
import {
  isUserLifecycleEvent,
  isUserStreamEvent,
  shouldRefetchOrganizations,
} from "./types"
import { useCentrifuge } from "./use-centrifuge"

const REFRESH_DEBOUNCE_MS = 500

export function UserCentrifugeListener() {
  const { user, isLoading, fetchUser } = useUser()
  const { fetchOrganizations } = useOrganization()

  const fetchUserRef = useRef(fetchUser)
  const fetchOrganizationsRef = useRef(fetchOrganizations)
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )

  useEffect(() => {
    fetchUserRef.current = fetchUser
    fetchOrganizationsRef.current = fetchOrganizations
  }, [fetchUser, fetchOrganizations])

  const debouncedRefreshOrganizations = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      void fetchOrganizationsRef.current()
    }, REFRESH_DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
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

      if (isUserLifecycleEvent(data)) {
        void fetchUserRef.current()
      }
    },
    [debouncedRefreshOrganizations]
  )

  const enabled = !isLoading && Boolean(user?.id)

  useCentrifuge(enabled, handlePublication)

  return null
}
