export interface User {
  id?: string
  clerkId?: string
  firstName?: string
  lastName?: string
  email?: string
  activeProjectId?: string | null
  /** @deprecated use firstName */
  firstname?: string
  /** @deprecated use lastName */
  lastname?: string
}

export interface UserState {
  user: User | null
  isLoading: boolean
  error: string | null
}

export type UserAction =
  | { type: "GET_USER"; payload: User }
  | { type: "GET_USER_ERROR"; payload: string }
  | { type: "GET_USER_LOADING"; payload: boolean }
