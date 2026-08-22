"use client"

import { useCallback, useEffect, useReducer } from "react"
import { listPlans } from "./api"
import { PlanContext } from "./context"
import { planReducer } from "./reducer"
import { PlanState } from "./types"

const initialState: PlanState = {
  plans: [],
  isLoading: false,
  error: null,
}

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(planReducer, initialState)

  const fetchPlans = useCallback(async () => {
    try {
      dispatch({ type: "GET_PLANS_LOADING", payload: true })
      const plans = await listPlans()
      dispatch({ type: "GET_PLANS", payload: plans })
    } catch {
      dispatch({
        type: "GET_PLANS_ERROR",
        payload: "Failed to fetch plans",
      })
    } finally {
      dispatch({ type: "GET_PLANS_LOADING", payload: false })
    }
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  return (
    <PlanContext.Provider
      value={{
        ...state,
        fetchPlans,
      }}
    >
      {children}
    </PlanContext.Provider>
  )
}
