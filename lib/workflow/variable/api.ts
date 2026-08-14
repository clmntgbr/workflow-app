import {
  CreateWorkflowVariableInput,
  UpdateWorkflowVariableInput,
  WorkflowVariable,
} from "./types"

async function readErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message
    }
  } catch {
    // ignore
  }
  return fallback
}

export async function listWorkflowVariables(
  workflowId: string
): Promise<WorkflowVariable[]> {
  const response = await fetch(`/api/workflows/${workflowId}/variables`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to list variables")
    )
  }

  const data = await response.json()
  return Array.isArray(data) ? data : []
}

export async function listAvailableVariables(
  workflowId: string,
  stepId: string
): Promise<WorkflowVariable[]> {
  const response = await fetch(
    `/api/workflows/${workflowId}/steps/${stepId}/variables`,
    {
      method: "GET",
    }
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to list available variables")
    )
  }

  const data = await response.json()
  return Array.isArray(data) ? data : []
}

export async function getWorkflowVariable(
  workflowId: string,
  variableId: string
): Promise<WorkflowVariable> {
  const response = await fetch(
    `/api/workflows/${workflowId}/variables/${variableId}`,
    {
      method: "GET",
    }
  )

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to get variable"))
  }

  return response.json()
}

export async function createWorkflowVariable(
  workflowId: string,
  input: CreateWorkflowVariableInput
): Promise<WorkflowVariable> {
  const response = await fetch(`/api/workflows/${workflowId}/variables`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to create variable")
    )
  }

  return response.json()
}

export async function updateWorkflowVariable(
  workflowId: string,
  variableId: string,
  input: UpdateWorkflowVariableInput
): Promise<WorkflowVariable> {
  const response = await fetch(
    `/api/workflows/${workflowId}/variables/${variableId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to update variable")
    )
  }

  return response.json()
}

export async function deleteWorkflowVariable(
  workflowId: string,
  variableId: string
): Promise<void> {
  const response = await fetch(
    `/api/workflows/${workflowId}/variables/${variableId}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Failed to delete variable")
    )
  }
}
