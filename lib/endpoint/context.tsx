"use client"

import { PaginateQuery } from "@/lib/paginate"
import { createContext, useContext } from "react"
import {
  CreateEndpointInput,
  Endpoint,
  EndpointState,
  UpdateEndpointInput,
} from "./types"

export interface EndpointContextType extends EndpointState {
  fetchEndpoints: (query?: PaginateQuery) => Promise<void>
  fetchEndpoint: (id: string) => Promise<Endpoint>
  createEndpoint: (input: CreateEndpointInput) => Promise<Endpoint>
  updateEndpoint: (id: string, input: UpdateEndpointInput) => Promise<Endpoint>
  removeEndpoint: (id: string) => Promise<void>
  setEditingEndpointId: (id: string | null) => void
}

export const EndpointContext = createContext<EndpointContextType | undefined>(
  undefined
)

export const useEndpoint = () => {
  const context = useContext(EndpointContext)
  if (!context) {
    throw new Error("useEndpoint must be used within EndpointProvider")
  }
  return context
}
