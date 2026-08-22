import type { QuotaAction, QuotaState } from "./types"

export const quotaReducer = (
  state: QuotaState,
  action: QuotaAction
): QuotaState => {
  switch (action.type) {
    case "GET_QUOTA":
      return {
        ...state,
        quota: action.payload,
        isLoading: false,
        error: null,
      }
    case "GET_QUOTA_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      }
    case "GET_QUOTA_ERROR":
      return {
        ...state,
        quota: null,
        isLoading: false,
        error: action.payload,
      }
    default:
      return state
  }
}
