"use client"

import { createContext, useContext } from "react"
import {
  CreateProjectInput,
  ProjectState,
  UpdateProjectInput,
} from "./types"

export interface ProjectContextType extends ProjectState {
  fetchProjects: () => Promise<void>
  createProject: (input: CreateProjectInput) => Promise<void>
  updateProject: (id: string, input: UpdateProjectInput) => Promise<void>
  activateProject: (id: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  removeMember: (projectId: string, userId: string) => Promise<void>
}

export const ProjectContext = createContext<ProjectContextType | undefined>(
  undefined
)

export const useProject = () => {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error("useProject must be used within ProjectProvider")
  }
  return context
}
