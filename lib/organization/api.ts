import {
  CreateOrganizationInput,
  Organization,
  UpdateOrganizationInput,
} from "./types"

export const listOrganizations = async (): Promise<Organization[]> => {
  const response = await fetch("/api/organizations", {
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
  const response = await fetch("/api/organizations", {
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
  const response = await fetch(`/api/organizations/${id}`, {
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
  const response = await fetch(`/api/organizations/${id}`, {
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
  const response = await fetch(`/api/organizations/${id}/activate`, {
    method: "POST",
  })

  if (!response.ok) {
    throw new Error("Failed to activate organization")
  }

  return response.json()
}

export const deleteOrganization = async (id: string): Promise<void> => {
  const response = await fetch(`/api/organizations/${id}`, {
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
  const response = await fetch(`/api/organizations/${organizationId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  })

  if (!response.ok) {
    throw new Error("Failed to add organization member")
  }
}

export const removeOrganizationMember = async (
  organizationId: string,
  userId: string
): Promise<void> => {
  const response = await fetch(
    `/api/organizations/${organizationId}/members/${userId}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    throw new Error("Failed to remove organization member")
  }
}
