export interface Project {
  id: string
  name: string
  isActive: boolean
  memberIds: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateProjectInput {
  name: string
}

export interface UpdateProjectInput {
  name: string
}

export interface ProjectState {
  projects: Project[]
  activeProject: Project | null
  isLoading: boolean
  error: string | null
}

export type ProjectAction =
  | { type: "GET_PROJECTS"; payload: Project[] }
  | { type: "GET_PROJECTS_ERROR"; payload: string }
  | { type: "GET_PROJECTS_LOADING"; payload: boolean }
  | { type: "SET_ACTIVE_PROJECT"; payload: Project }
  | { type: "UPSERT_PROJECT"; payload: Project }
  | { type: "REMOVE_PROJECT"; payload: string }
