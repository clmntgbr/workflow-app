"use client"

import { useCallback, useReducer } from "react"
import { getQuota } from "./api"
import { QuotaContext } from "./context"
import { quotaReducer } from "./reducer"
import type { QuotaState } from "./types"

const initialState: QuotaState = {
  quota: null,
  isLoading: false,
  error: null,
}

export function QuotaProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(quotaReducer, initialState)

  const fetchQuota = useCallback(async () => {
    try {
      dispatch({ type: "GET_QUOTA_LOADING", payload: true })
      const quota = await getQuota()
      dispatch({ type: "GET_QUOTA", payload: quota })
    } catch {
      dispatch({
        type: "GET_QUOTA_ERROR",
        payload: "Failed to fetch quota",
      })
    } finally {
      dispatch({ type: "GET_QUOTA_LOADING", payload: false })
    }
  }, [])

  return (
    <QuotaContext.Provider
      value={{
        ...state,
        fetchQuota,
      }}
    >
      {children}
    </QuotaContext.Provider>
  )
}
