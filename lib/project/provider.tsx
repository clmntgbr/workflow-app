"use client"

import { useUser } from "@/lib/user/context"
import { useCallback, useEffect, useReducer, useRef } from "react"
import {
  activateProject as activateProjectRequest,
  createProject as createProjectRequest,
  deleteProject as deleteProjectRequest,
  getProject,
  listProjects,
  PROJECTS_PAGE_LIMIT,
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
  page: 1,
  totalPages: 0,
  total: 0,
  isLoading: true,
  isLoadingMore: false,
  error: null,
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialState)
  const { user } = useUser()
  const stateRef = useRef(state)
  const loadingMoreRef = useRef(false)

  stateRef.current = state

  const fetchProjects = useCallback(async () => {
    try {
      loadingMoreRef.current = false
      dispatch({ type: "GET_PROJECTS_LOADING", payload: true })
      const projects = await listProjects({
        page: 1,
        limit: PROJECTS_PAGE_LIMIT,
      })
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

  const fetchMoreProjects = useCallback(async () => {
    const current = stateRef.current
    if (loadingMoreRef.current || current.isLoading) return
    if (current.page >= current.totalPages) return

    const nextPage = current.page + 1
    loadingMoreRef.current = true
    dispatch({ type: "GET_PROJECTS_LOADING_MORE", payload: true })

    try {
      const projects = await listProjects({
        page: nextPage,
        limit: PROJECTS_PAGE_LIMIT,
      })
      dispatch({ type: "APPEND_PROJECTS", payload: projects })
    } catch {
      dispatch({ type: "GET_PROJECTS_LOADING_MORE", payload: false })
    } finally {
      loadingMoreRef.current = false
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

  const activateProject = useCallback(async (id: string) => {
    const current = stateRef.current
    if (id === current.activeProject?.id) return

    const next =
      current.projects.find((project) => project.id === id) ??
      (current.activeProject?.id === id
        ? current.activeProject
        : await getProject(id))

    if (!next) return

    const previousProjects = current.projects
    const previousActive = current.activeProject
    const previousPage = current.page
    const previousTotalPages = current.totalPages
    const previousTotal = current.total

    dispatch({ type: "SET_ACTIVE_PROJECT", payload: next })

    try {
      await activateProjectRequest(id)
    } catch (error) {
      dispatch({
        type: "GET_PROJECTS",
        payload: {
          members: previousProjects,
          page: previousPage,
          limit: PROJECTS_PAGE_LIMIT,
          totalPages: previousTotalPages,
          total: previousTotal,
        },
      })
      if (previousActive) {
        dispatch({ type: "SET_ACTIVE_PROJECT", payload: previousActive })
      }
      throw error
    }
  }, [])

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

  useEffect(() => {
    if (state.isLoading) return

    const id = user?.activeProjectId
    if (!id || state.activeProject?.id === id) return

    const listed = state.projects.find((project) => project.id === id)
    if (listed) {
      dispatch({ type: "SET_ACTIVE_PROJECT", payload: listed })
      return
    }

    let cancelled = false
    void getProject(id)
      .then((project) => {
        if (!cancelled) {
          dispatch({ type: "SET_ACTIVE_PROJECT", payload: project })
        }
      })
      .catch(() => {
        // Active project may not be on the current page.
      })

    return () => {
      cancelled = true
    }
  }, [
    state.activeProject?.id,
    state.isLoading,
    state.projects,
    user?.activeProjectId,
  ])

  return (
    <ProjectContext.Provider
      value={{
        ...state,
        fetchProjects,
        fetchMoreProjects,
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
