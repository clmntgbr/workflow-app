import { initPaginate } from "@/lib/paginate"
import { Workflow, WorkflowAction, WorkflowState } from "./types"

export const workflowReducer = (
  state: WorkflowState,
  action: WorkflowAction
): WorkflowState => {
  switch (action.type) {
    case "GET_WORKFLOWS":
      return {
        ...state,
        workflows: action.payload,
        isLoading: false,
        error: null,
      }
    case "GET_WORKFLOWS_ERROR":
      return {
        ...state,
        workflows: initPaginate<Workflow>(),
        isLoading: false,
        error: action.payload,
      }
    case "GET_WORKFLOWS_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      }
    case "UPSERT_WORKFLOW": {
      const exists = state.workflows.members.some(
        (workflow) => workflow.id === action.payload.id
      )
      const members = exists
        ? state.workflows.members.map((workflow) =>
            workflow.id === action.payload.id ? action.payload : workflow
          )
        : [action.payload, ...state.workflows.members]

      return {
        ...state,
        workflows: {
          ...state.workflows,
          members,
          total: exists ? state.workflows.total : state.workflows.total + 1,
        },
        error: null,
      }
    }
    case "REMOVE_WORKFLOW": {
      const members = state.workflows.members.filter(
        (workflow) => workflow.id !== action.payload
      )
      return {
        ...state,
        workflows: {
          ...state.workflows,
          members,
          total: Math.max(0, state.workflows.total - 1),
        },
        error: null,
      }
    }
    default:
      return state
  }
}
