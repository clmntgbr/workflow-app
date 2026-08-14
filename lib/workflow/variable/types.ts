export interface WorkflowVariable {
  id: string
  name: string
  key: string
  description: string | null
  path: string
  stepId: string
  workflowId: string
  isSecret: boolean
  defaultValue: unknown | null
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
  isSecret?: boolean
  defaultValue?: unknown | null
}

export interface UpdateWorkflowVariableInput {
  name: string
  key: string
  description?: string
  path: string
  isSecret?: boolean
  defaultValue?: unknown | null
}
