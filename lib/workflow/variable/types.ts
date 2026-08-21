export type WorkflowVariableKind = "static" | "extracted"

export interface WorkflowVariable {
  id: string
  name: string
  key: string
  description: string | null
  kind: WorkflowVariableKind
  path: string | null
  value?: unknown
  stepId: string | null
  workflowId: string
  lastValue?: unknown | null
  createdAt: string
  updatedAt: string
}

export type CreateWorkflowVariableInput =
  | {
      kind: "static"
      name: string
      key: string
      description?: string
      value: unknown
    }
  | {
      kind: "extracted"
      stepId: string
      name: string
      key: string
      description?: string
      path: string
    }

export type UpdateWorkflowVariableInput =
  | {
      name: string
      key: string
      description?: string
      path: string
    }
  | {
      name: string
      key: string
      description?: string
      value: unknown
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
