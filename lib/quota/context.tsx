"use client"

import { createContext, useContext } from "react"
import type { QuotaState } from "./types"

export interface QuotaContextType extends QuotaState {
  fetchQuota: () => Promise<void>
}

export const QuotaContext = createContext<QuotaContextType | undefined>(
  undefined
)

export const useQuota = () => {
  const context = useContext(QuotaContext)
  if (!context) {
    throw new Error("useQuota must be used within QuotaProvider")
  }
  return context
}
