import { PlanAction, PlanState } from "./types"

export const planReducer = (state: PlanState, action: PlanAction): PlanState => {
  switch (action.type) {
    case "GET_PLANS":
      return {
        ...state,
        plans: action.payload,
        isLoading: false,
        error: null,
      }
    case "GET_PLANS_ERROR":
      return {
        ...state,
        plans: [],
        isLoading: false,
        error: action.payload,
      }
    case "GET_PLANS_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      }
    default:
      return state
  }
}
