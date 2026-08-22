"use client"

import { useCallback, useEffect, useReducer } from "react"
import {
  activateProject as activateProjectRequest,
  createProject as createProjectRequest,
  deleteProject as deleteProjectRequest,
  listProjects,
  removeProjectMember,
  updateProject as updateProjectRequest,
} from "./api"
import { ProjectContext } from "./context"
import { projectReducer } from "./reducer"
import {
  CreateProjectInput,
  ProjectState,
  UpdateProjectInput,
} from "./types"

const initialState: ProjectState = {
  projects: [],
  activeProject: null,
  isLoading: false,
  error: null,
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialState)

  const fetchProjects = useCallback(async () => {
    try {
      dispatch({ type: "GET_PROJECTS_LOADING", payload: true })
      const projects = await listProjects()
      dispatch({ type: "GET_PROJECTS", payload: projects })
    } catch {
      dispatch({
        type: "GET_PROJECTS_ERROR",
        payload: "Failed to fetch projects",
      })
    } finally {
      dispatch({ type: "GET_PROJECTS_LOADING", payload: false })
    }
  }, [])

  // Mutations only — state refresh comes from Centrifugo events.
  const createProject = useCallback(async (input: CreateProjectInput) => {
    await createProjectRequest(input)
  }, [])

  const updateProject = useCallback(
    async (id: string, input: UpdateProjectInput) => {
      await updateProjectRequest(id, input)
    },
    []
  )

  const activateProject = useCallback(
    async (id: string) => {
      const previousProjects = state.projects
      const next = state.projects.find((project) => project.id === id)
      if (!next || next.id === state.activeProject?.id) return

      dispatch({ type: "SET_ACTIVE_PROJECT", payload: next })

      try {
        await activateProjectRequest(id)
      } catch (error) {
        dispatch({
          type: "GET_PROJECTS",
          payload: previousProjects,
        })
        throw error
      }
    },
    [state.activeProject?.id, state.projects]
  )

  const deleteProject = useCallback(async (id: string) => {
    await deleteProjectRequest(id)
  }, [])

  const removeMember = useCallback(
    async (projectId: string, userId: string) => {
      await removeProjectMember(projectId, userId)
    },
    []
  )

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return (
    <ProjectContext.Provider
      value={{
        ...state,
        fetchProjects,
        createProject,
        updateProject,
        activateProject,
        deleteProject,
        removeMember,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}
