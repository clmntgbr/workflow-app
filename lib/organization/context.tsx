"use client"

import { createContext, useContext } from "react"
import {
  CreateOrganizationInput,
  OrganizationState,
  UpdateOrganizationInput,
} from "./types"

export interface OrganizationContextType extends OrganizationState {
  fetchOrganizations: () => Promise<void>
  createOrganization: (input: CreateOrganizationInput) => Promise<void>
  updateOrganization: (
    id: string,
    input: UpdateOrganizationInput
  ) => Promise<void>
  activateOrganization: (id: string) => Promise<void>
  deleteOrganization: (id: string) => Promise<void>
  addMember: (organizationId: string, userId: string) => Promise<void>
  removeMember: (organizationId: string, userId: string) => Promise<void>
}

export const OrganizationContext = createContext<
  OrganizationContextType | undefined
>(undefined)

export const useOrganization = () => {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error("useOrganization must be used within OrganizationProvider")
  }
  return context
}
