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
import { Building2, Check, ChevronsUpDown, Loader2Icon, Plus } from "lucide-react"
import * as React from "react"

export function ProjectSwitcher() {
  const {
    projects,
    activeProject,
    page,
    totalPages,
    isLoading,
    isLoadingMore,
    activateProject,
    fetchMoreProjects,
  } = useProject()
  const [isPending, setIsPending] = React.useState(false)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const listRef = React.useRef<HTMLDivElement>(null)
  const sentinelRef = React.useRef<HTMLDivElement>(null)

  const listedIds = new Set(projects.map((project) => project.id))
  const items =
    activeProject && !listedIds.has(activeProject.id)
      ? [activeProject, ...projects]
      : projects

  const handleActivate = async (projectId: string) => {
    if (projectId === activeProject?.id || isPending) return
    try {
      setIsPending(true)
      await activateProject(projectId)
    } finally {
      setIsPending(false)
    }
  }

  React.useEffect(() => {
    if (!isOpen) return
    if (isLoading || isLoadingMore) return
    if (page >= totalPages) return

    const sentinel = sentinelRef.current
    const root = listRef.current
    if (!sentinel || !root) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        if (page >= totalPages) return
        void fetchMoreProjects()
      },
      { root, rootMargin: "40px", threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [
    fetchMoreProjects,
    isLoading,
    isLoadingMore,
    isOpen,
    page,
    totalPages,
  ])

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
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
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
          className="min-w-56 overflow-hidden rounded-lg p-0"
          align="start"
          sideOffset={4}
        >
          <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground">
            Projects
          </DropdownMenuLabel>
          <div ref={listRef} className="max-h-72 overflow-y-auto px-1">
            {items.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => handleActivate(project.id)}
                className="gap-2 p-2"
              >
                <span className="flex size-6 items-center justify-center rounded-md border">
                  <Building2 className="size-3.5 shrink-0" />
                </span>
                <span className="flex-1 truncate">{project.name}</span>
                {project.isActive || project.id === activeProject?.id ? (
                  <Check className="size-4 shrink-0" />
                ) : null}
              </DropdownMenuItem>
            ))}
            <div ref={sentinelRef} className="h-1 w-full" />
            {isLoadingMore ? (
              <div className="flex items-center justify-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                <Loader2Icon className="size-3.5 animate-spin" />
                Loading more…
              </div>
            ) : null}
          </div>
          <DropdownMenuSeparator className="my-1" />
          <div className="px-1 pb-1">
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
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </>
  )
}
