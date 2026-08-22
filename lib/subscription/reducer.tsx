import { SubscriptionAction, SubscriptionState } from "./types"

export const subscriptionReducer = (
  state: SubscriptionState,
  action: SubscriptionAction
): SubscriptionState => {
  switch (action.type) {
    case "GET_SUBSCRIPTION":
      return {
        ...state,
        subscription: action.payload,
        isLoading: false,
        error: null,
      }
    case "GET_SUBSCRIPTION_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      }
    case "GET_SUBSCRIPTION_ERROR":
      return {
        ...state,
        subscription: null,
        isLoading: false,
        error: action.payload,
      }
    case "CREATE_SUBSCRIPTION_LOADING":
      return {
        ...state,
        isCreating: action.payload,
        error: action.payload ? null : state.error,
      }
    case "CREATE_SUBSCRIPTION_ERROR":
      return {
        ...state,
        isCreating: false,
        error: action.payload,
      }
    case "CREATE_SUBSCRIPTION_SUCCESS":
      return {
        ...state,
        isCreating: false,
        error: null,
      }
    case "PAYMENT_SUCCEEDED":
      return {
        ...state,
        paymentSucceeded: true,
      }
    case "RESET_PAYMENT_SUCCEEDED":
      return {
        ...state,
        paymentSucceeded: false,
      }
    default:
      return state
  }
}
