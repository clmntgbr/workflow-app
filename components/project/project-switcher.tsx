"use client"

import { CreateProjectDialog } from "@/components/project/create-project-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useProject } from "@/lib/project/context"
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react"
import * as React from "react"

export function ProjectSwitcher() {
  const {
    projects,
    activeProject,
    isLoading,
    activateProject,
  } = useProject()
  const [isPending, setIsPending] = React.useState(false)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)

  const handleActivate = async (projectId: string) => {
    if (projectId === activeProject?.id || isPending) return
    try {
      setIsPending(true)
      await activateProject(projectId)
    } finally {
      setIsPending(false)
    }
  }

  if (isLoading && !activeProject) {
    return <Skeleton className="h-9 w-44" />
  }

  if (!activeProject && projects.length === 0) {
    return (
      <>
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={() => setIsCreateOpen(true)}
          disabled={isPending}
        >
          <Plus className="size-4" />
          Create project
        </Button>
        <CreateProjectDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
        />
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="lg"
            className="min-w-44 justify-between gap-2 data-[state=open]:bg-muted"
            disabled={isPending}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="size-3.5" />
              </span>
              <span className="truncate font-medium">
                {activeProject?.name ?? "Select project"}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-56 rounded-lg"
          align="start"
          sideOffset={4}
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Projects
          </DropdownMenuLabel>
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => handleActivate(project.id)}
              className="gap-2 p-2"
            >
              <span className="flex size-6 items-center justify-center rounded-md border">
                <Building2 className="size-3.5 shrink-0" />
              </span>
              <span className="flex-1 truncate">{project.name}</span>
              {project.isActive ? (
                <Check className="size-4 shrink-0" />
              ) : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 p-2"
            onClick={() => setIsCreateOpen(true)}
            disabled={isPending}
          >
            <span className="flex size-6 items-center justify-center rounded-md border bg-transparent">
              <Plus className="size-4" />
            </span>
            <span className="font-medium text-muted-foreground">
              Add project
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </>
  )
}
