import { Project, ProjectAction, ProjectState } from "./types"

function resolveActiveProject(projects: Project[]): Project | null {
  return projects.find((project) => project.isActive) ?? null
}

function withActiveFlags(
  projects: Project[],
  activeId: string | null
): Project[] {
  return projects.map((project) => ({
    ...project,
    isActive: activeId !== null && project.id === activeId,
  }))
}

export const projectReducer = (
  state: ProjectState,
  action: ProjectAction
): ProjectState => {
  switch (action.type) {
    case "GET_PROJECTS": {
      const projects = action.payload
      return {
        ...state,
        projects,
        activeProject: resolveActiveProject(projects),
        isLoading: false,
        error: null,
      }
    }
    case "GET_PROJECTS_ERROR":
      return {
        ...state,
        projects: [],
        activeProject: null,
        isLoading: false,
        error: action.payload,
      }
    case "GET_PROJECTS_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      }
    case "SET_ACTIVE_PROJECT": {
      const projects = withActiveFlags(state.projects, action.payload.id)
      return {
        ...state,
        projects,
        activeProject: resolveActiveProject(projects),
        error: null,
      }
    }
    case "UPSERT_PROJECT": {
      const exists = state.projects.some(
        (project) => project.id === action.payload.id
      )
      const projects = exists
        ? state.projects.map((project) =>
            project.id === action.payload.id ? action.payload : project
          )
        : [...state.projects, action.payload]

      const nextProjects = action.payload.isActive
        ? withActiveFlags(projects, action.payload.id)
        : projects

      return {
        ...state,
        projects: nextProjects,
        activeProject: resolveActiveProject(nextProjects),
        error: null,
      }
    }
    case "REMOVE_PROJECT": {
      const projects = state.projects.filter(
        (project) => project.id !== action.payload
      )
      return {
        ...state,
        projects,
        activeProject: resolveActiveProject(projects),
        error: null,
      }
    }
    default:
      return state
  }
}
