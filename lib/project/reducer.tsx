import { Paginate } from "@/lib/paginate"
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

function mergeUniqueProjects(
  current: Project[],
  incoming: Project[]
): Project[] {
  const seen = new Set(current.map((project) => project.id))
  const appended = incoming.filter((project) => !seen.has(project.id))
  return [...current, ...appended]
}

function applyPaginateMeta(
  payload: Paginate<Project>
): Pick<ProjectState, "page" | "totalPages" | "total"> {
  return {
    page: payload.page,
    totalPages: payload.totalPages,
    total: payload.total,
  }
}

export const projectReducer = (
  state: ProjectState,
  action: ProjectAction
): ProjectState => {
  switch (action.type) {
    case "GET_PROJECTS": {
      const projects = action.payload.members
      const fromList = resolveActiveProject(projects)
      return {
        ...state,
        projects,
        ...applyPaginateMeta(action.payload),
        activeProject:
          projects.length === 0 ? null : (fromList ?? state.activeProject),
        isLoading: false,
        isLoadingMore: false,
        error: null,
      }
    }
    case "APPEND_PROJECTS": {
      const projects = mergeUniqueProjects(
        state.projects,
        action.payload.members
      )
      const fromList = resolveActiveProject(projects)
      return {
        ...state,
        projects,
        ...applyPaginateMeta(action.payload),
        activeProject: fromList ?? state.activeProject,
        isLoadingMore: false,
        error: null,
      }
    }
    case "GET_PROJECTS_ERROR":
      return {
        ...state,
        isLoading: false,
        isLoadingMore: false,
        error: action.payload,
      }
    case "GET_PROJECTS_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      }
    case "GET_PROJECTS_LOADING_MORE":
      return {
        ...state,
        isLoadingMore: action.payload,
      }
    case "SET_ACTIVE_PROJECT": {
      const projects = withActiveFlags(state.projects, action.payload.id)
      return {
        ...state,
        projects,
        activeProject: {
          ...action.payload,
          isActive: true,
        },
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
        activeProject: action.payload.isActive
          ? { ...action.payload, isActive: true }
          : (resolveActiveProject(nextProjects) ?? state.activeProject),
        error: null,
      }
    }
    case "REMOVE_PROJECT": {
      const projects = state.projects.filter(
        (project) => project.id !== action.payload
      )
      const activeProject =
        state.activeProject?.id === action.payload
          ? resolveActiveProject(projects)
          : state.activeProject
      return {
        ...state,
        projects,
        activeProject,
        error: null,
      }
    }
    default:
      return state
  }
}
