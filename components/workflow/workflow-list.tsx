"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { WorkflowDrawer } from "@/components/workflow/workflow-drawer"
import { useProject } from "@/lib/project/context"
import { useWorkflow } from "@/lib/workflow/context"
import { Workflow } from "@/lib/workflow/types"
import { PlusIcon, SettingsIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export function WorkflowList() {
  const { activeProject } = useProject()
  const { workflows, isLoading } = useWorkflow()
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  )
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("edit")

  const openCreate = () => {
    setSelectedWorkflow(null)
    setDrawerMode("create")
    setIsDrawerOpen(true)
  }

  const openEdit = (workflow: Workflow) => {
    setSelectedWorkflow(workflow)
    setDrawerMode("edit")
    setIsDrawerOpen(true)
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedWorkflow(null)
  }

  if (!activeProject) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Select or create a project to manage workflows.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Workflows</h1>
          <p className="text-sm text-muted-foreground">
            Workflows for {activeProject.name}
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="size-4" />
          New workflow
        </Button>
      </div>

      {isLoading && workflows.members.length === 0 ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : workflows.members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No workflows yet. Create one to get started.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {workflows.members.map((workflow) => (
            <li key={workflow.id} className="flex items-stretch">
              <Link
                href={`/workflow/${workflow.id}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-3 text-left hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{workflow.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {workflow.description || "No description"}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border px-2 py-0.5 text-xs capitalize text-muted-foreground">
                  {workflow.status}
                </span>
              </Link>
              <div className="flex items-center border-s px-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${workflow.name}`}
                  onClick={() => openEdit(workflow)}
                >
                  <SettingsIcon className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <WorkflowDrawer
        workflow={drawerMode === "edit" ? selectedWorkflow : null}
        isOpen={isDrawerOpen}
        onOpenChange={(open) => {
          if (!open) closeDrawer()
          else setIsDrawerOpen(true)
        }}
        onSaved={(workflow) => {
          if (drawerMode === "edit") setSelectedWorkflow(workflow)
        }}
        onDeleted={closeDrawer}
      />
    </div>
  )
}
