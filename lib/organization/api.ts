import {
  CreateOrganizationInput,
  Organization,
  UpdateOrganizationInput,
} from "./types"

const ORGANIZATIONS_COLLECTION_PATH =
  "/api/d0a666d0a28386b0e32bbfce7e7cb034"
const ORGANIZATION_ITEM_PATH = "/api/753141f73576493060226a97e10e5129"
const ORGANIZATION_ACTIVATE_PATH = "/api/c03895dc1f9b360291e584250f95698d"
const ORGANIZATION_MEMBERS_PATH = "/api/7b0f23a6be26ae90246195281519d66d"

export const listOrganizations = async (): Promise<Organization[]> => {
  const response = await fetch(ORGANIZATIONS_COLLECTION_PATH, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to list organizations")
  }

  return response.json()
}

export const createOrganization = async (
  input: CreateOrganizationInput
): Promise<Organization> => {
  const response = await fetch(ORGANIZATIONS_COLLECTION_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Failed to create organization")
  }

  return response.json()
}

export const getOrganization = async (id: string): Promise<Organization> => {
  const response = await fetch(`${ORGANIZATION_ITEM_PATH}/${id}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to get organization")
  }

  return response.json()
}

export const updateOrganization = async (
  id: string,
  input: UpdateOrganizationInput
): Promise<Organization> => {
  const response = await fetch(`${ORGANIZATION_ITEM_PATH}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Failed to update organization")
  }

  return response.json()
}

export const activateOrganization = async (
  id: string
): Promise<Organization> => {
  const response = await fetch(`${ORGANIZATION_ACTIVATE_PATH}/${id}`, {
    method: "POST",
  })

  if (!response.ok) {
    throw new Error("Failed to activate organization")
  }

  return response.json()
}

export const deleteOrganization = async (id: string): Promise<void> => {
  const response = await fetch(`${ORGANIZATION_ITEM_PATH}/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete organization")
  }
}

export const addOrganizationMember = async (
  organizationId: string,
  userId: string
): Promise<void> => {
  const response = await fetch(
    `${ORGANIZATION_MEMBERS_PATH}/${organizationId}/members`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }
  )

  if (!response.ok) {
    throw new Error("Failed to add organization member")
  }
}

export const removeOrganizationMember = async (
  organizationId: string,
  userId: string
): Promise<void> => {
  const response = await fetch(
    `${ORGANIZATION_MEMBERS_PATH}/${organizationId}/members/${userId}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    throw new Error("Failed to remove organization member")
  }
}
