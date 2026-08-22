"use client"

import { useCallback, useReducer } from "react"
import {
  createSubscription as createSubscriptionRequest,
  getSubscription,
} from "./api"
import { SubscriptionContext } from "./context"
import { subscriptionReducer } from "./reducer"
import { CreateSubscriptionResponse, SubscriptionState } from "./types"

const initialState: SubscriptionState = {
  subscription: null,
  isLoading: false,
  isCreating: false,
  paymentSucceeded: false,
  error: null,
}

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [state, dispatch] = useReducer(subscriptionReducer, initialState)

  const fetchSubscription = useCallback(async () => {
    try {
      dispatch({ type: "GET_SUBSCRIPTION_LOADING", payload: true })
      const subscription = await getSubscription()
      dispatch({ type: "GET_SUBSCRIPTION", payload: subscription })
    } catch {
      dispatch({
        type: "GET_SUBSCRIPTION_ERROR",
        payload: "Failed to fetch subscription",
      })
    } finally {
      dispatch({ type: "GET_SUBSCRIPTION_LOADING", payload: false })
    }
  }, [])

  const createSubscription = useCallback(
    async (
      planId: string,
      options?: { prorationDate?: number }
    ): Promise<CreateSubscriptionResponse | null> => {
      try {
        dispatch({ type: "CREATE_SUBSCRIPTION_LOADING", payload: true })
        const result = await createSubscriptionRequest({
          planId,
          ...(options?.prorationDate != null
            ? { prorationDate: options.prorationDate }
            : {}),
        })
        dispatch({ type: "CREATE_SUBSCRIPTION_SUCCESS" })
        return result
      } catch {
        dispatch({
          type: "CREATE_SUBSCRIPTION_ERROR",
          payload: "Failed to create subscription",
        })
        return null
      } finally {
        dispatch({ type: "CREATE_SUBSCRIPTION_LOADING", payload: false })
      }
    },
    []
  )

  const markPaymentSucceeded = useCallback(() => {
    dispatch({ type: "PAYMENT_SUCCEEDED" })
  }, [])

  const resetPaymentSucceeded = useCallback(() => {
    dispatch({ type: "RESET_PAYMENT_SUCCEEDED" })
  }, [])

  return (
    <SubscriptionContext.Provider
      value={{
        ...state,
        fetchSubscription,
        createSubscription,
        markPaymentSucceeded,
        resetPaymentSucceeded,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}
