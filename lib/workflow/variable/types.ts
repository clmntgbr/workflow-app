export interface WorkflowVariable {
  id: string
  name: string
  key: string
  description: string | null
  path: string
  stepId: string
  workflowId: string
  lastValue: unknown | null
  createdAt: string
  updatedAt: string
}

export interface CreateWorkflowVariableInput {
  stepId: string
  name: string
  key: string
  description?: string
  path: string
}

export interface UpdateWorkflowVariableInput {
  name: string
  key: string
  description?: string
  path: string
}
