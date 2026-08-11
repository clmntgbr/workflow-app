export interface Organization {
  id: string
  name: string
  isActive: boolean
  memberIds: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateOrganizationInput {
  name: string
}

export interface UpdateOrganizationInput {
  name: string
}

export interface OrganizationState {
  organizations: Organization[]
  activeOrganization: Organization | null
  isLoading: boolean
  error: string | null
}

export type OrganizationAction =
  | { type: "GET_ORGANIZATIONS"; payload: Organization[] }
  | { type: "GET_ORGANIZATIONS_ERROR"; payload: string }
  | { type: "GET_ORGANIZATIONS_LOADING"; payload: boolean }
  | { type: "SET_ACTIVE_ORGANIZATION"; payload: Organization }
  | { type: "UPSERT_ORGANIZATION"; payload: Organization }
  | { type: "REMOVE_ORGANIZATION"; payload: string }
