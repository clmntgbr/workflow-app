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

export interface VariableUsageStep {
  id: string
  endpointId: string
  name: string
  url: string
  method: string
}

export class VariableInUseError extends Error {
  readonly steps: VariableUsageStep[]

  constructor(message: string, steps: VariableUsageStep[]) {
    super(message)
    this.name = "VariableInUseError"
    this.steps = steps
  }
}
