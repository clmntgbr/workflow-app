import { initPaginate } from "@/lib/paginate"
import { Endpoint, EndpointAction, EndpointState } from "./types"

export const endpointReducer = (
  state: EndpointState,
  action: EndpointAction
): EndpointState => {
  switch (action.type) {
    case "GET_ENDPOINTS":
      return {
        ...state,
        endpoints: action.payload,
        isLoading: false,
        error: null,
      }
    case "GET_ENDPOINTS_ERROR":
      return {
        ...state,
        endpoints: initPaginate<Endpoint>(),
        isLoading: false,
        error: action.payload,
      }
    case "GET_ENDPOINTS_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      }
    case "UPSERT_ENDPOINT": {
      const exists = state.endpoints.members.some(
        (endpoint) => endpoint.id === action.payload.id
      )
      const members = exists
        ? state.endpoints.members.map((endpoint) =>
            endpoint.id === action.payload.id ? action.payload : endpoint
          )
        : [action.payload, ...state.endpoints.members]

      return {
        ...state,
        endpoints: {
          ...state.endpoints,
          members,
          total: exists ? state.endpoints.total : state.endpoints.total + 1,
        },
        error: null,
      }
    }
    case "REMOVE_ENDPOINT": {
      const members = state.endpoints.members.filter(
        (endpoint) => endpoint.id !== action.payload
      )
      return {
        ...state,
        endpoints: {
          ...state.endpoints,
          members,
          total: Math.max(0, state.endpoints.total - 1),
        },
        editingEndpointId:
          state.editingEndpointId === action.payload
            ? null
            : state.editingEndpointId,
        error: null,
      }
    }
    case "SET_EDITING_ENDPOINT_ID":
      return {
        ...state,
        editingEndpointId: action.payload,
      }
    default:
      return state
  }
}
