import { Organization, OrganizationAction, OrganizationState } from "./types"

function resolveActiveOrganization(
  organizations: Organization[]
): Organization | null {
  return organizations.find((organization) => organization.isActive) ?? null
}

function withActiveFlags(
  organizations: Organization[],
  activeId: string | null
): Organization[] {
  return organizations.map((organization) => ({
    ...organization,
    isActive: activeId !== null && organization.id === activeId,
  }))
}

export const organizationReducer = (
  state: OrganizationState,
  action: OrganizationAction
): OrganizationState => {
  switch (action.type) {
    case "GET_ORGANIZATIONS": {
      const organizations = action.payload
      return {
        ...state,
        organizations,
        activeOrganization: resolveActiveOrganization(organizations),
        isLoading: false,
        error: null,
      }
    }
    case "GET_ORGANIZATIONS_ERROR":
      return {
        ...state,
        organizations: [],
        activeOrganization: null,
        isLoading: false,
        error: action.payload,
      }
    case "GET_ORGANIZATIONS_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      }
    case "SET_ACTIVE_ORGANIZATION": {
      const organizations = withActiveFlags(
        state.organizations,
        action.payload.id
      )
      return {
        ...state,
        organizations,
        activeOrganization: resolveActiveOrganization(organizations),
        error: null,
      }
    }
    case "UPSERT_ORGANIZATION": {
      const exists = state.organizations.some(
        (organization) => organization.id === action.payload.id
      )
      const organizations = exists
        ? state.organizations.map((organization) =>
            organization.id === action.payload.id
              ? action.payload
              : organization
          )
        : [...state.organizations, action.payload]

      const nextOrganizations = action.payload.isActive
        ? withActiveFlags(organizations, action.payload.id)
        : organizations

      return {
        ...state,
        organizations: nextOrganizations,
        activeOrganization: resolveActiveOrganization(nextOrganizations),
        error: null,
      }
    }
    case "REMOVE_ORGANIZATION": {
      const organizations = state.organizations.filter(
        (organization) => organization.id !== action.payload
      )
      return {
        ...state,
        organizations,
        activeOrganization: resolveActiveOrganization(organizations),
        error: null,
      }
    }
    default:
      return state
  }
}
