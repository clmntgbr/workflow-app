"use client"

import { useCallback, useEffect, useReducer } from "react"
import {
  activateOrganization as activateOrganizationRequest,
  addOrganizationMember,
  createOrganization as createOrganizationRequest,
  deleteOrganization as deleteOrganizationRequest,
  listOrganizations,
  removeOrganizationMember,
  updateOrganization as updateOrganizationRequest,
} from "./api"
import { OrganizationContext } from "./context"
import { organizationReducer } from "./reducer"
import {
  CreateOrganizationInput,
  OrganizationState,
  UpdateOrganizationInput,
} from "./types"

const initialState: OrganizationState = {
  organizations: [],
  activeOrganization: null,
  isLoading: false,
  error: null,
}

export function OrganizationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [state, dispatch] = useReducer(organizationReducer, initialState)

  const fetchOrganizations = useCallback(async () => {
    try {
      dispatch({ type: "GET_ORGANIZATIONS_LOADING", payload: true })
      const organizations = await listOrganizations()
      dispatch({ type: "GET_ORGANIZATIONS", payload: organizations })
    } catch {
      dispatch({
        type: "GET_ORGANIZATIONS_ERROR",
        payload: "Failed to fetch organizations",
      })
    } finally {
      dispatch({ type: "GET_ORGANIZATIONS_LOADING", payload: false })
    }
  }, [])

  // Mutations only — state refresh comes from Centrifugo events.
  const createOrganization = useCallback(
    async (input: CreateOrganizationInput) => {
      await createOrganizationRequest(input)
    },
    []
  )

  const updateOrganization = useCallback(
    async (id: string, input: UpdateOrganizationInput) => {
      await updateOrganizationRequest(id, input)
    },
    []
  )

  const activateOrganization = useCallback(
    async (id: string) => {
      const previousOrganizations = state.organizations
      const next = state.organizations.find(
        (organization) => organization.id === id
      )
      if (!next || next.id === state.activeOrganization?.id) return

      dispatch({ type: "SET_ACTIVE_ORGANIZATION", payload: next })

      try {
        await activateOrganizationRequest(id)
      } catch (error) {
        dispatch({
          type: "GET_ORGANIZATIONS",
          payload: previousOrganizations,
        })
        throw error
      }
    },
    [state.activeOrganization?.id, state.organizations]
  )

  const deleteOrganization = useCallback(async (id: string) => {
    await deleteOrganizationRequest(id)
  }, [])

  const addMember = useCallback(
    async (organizationId: string, userId: string) => {
      await addOrganizationMember(organizationId, userId)
    },
    []
  )

  const removeMember = useCallback(
    async (organizationId: string, userId: string) => {
      await removeOrganizationMember(organizationId, userId)
    },
    []
  )

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  return (
    <OrganizationContext.Provider
      value={{
        ...state,
        fetchOrganizations,
        createOrganization,
        updateOrganization,
        activateOrganization,
        deleteOrganization,
        addMember,
        removeMember,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}
