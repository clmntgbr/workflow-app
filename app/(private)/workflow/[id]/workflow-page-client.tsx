"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { WorkflowDrawer } from "@/components/workflow/workflow-drawer"
import { WorkflowNotFoundView } from "@/components/workflow/workflow-not-found-view"
import { useOrganization } from "@/lib/organization/context"
import { getWorkflow, WorkflowNotFoundError } from "@/lib/workflow/api"
import { Workflow } from "@/lib/workflow/types"
import { ArrowLeftIcon, SettingsIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface WorkflowPageClientProps {
  workflowId: string
}

export function WorkflowPageClient({ workflowId }: WorkflowPageClientProps) {
  const router = useRouter()
  const { activeOrganization } = useOrganization()
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    if (!activeOrganization?.id) return

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setIsNotFound(false)
      setError(null)

      try {
        const next = await getWorkflow(workflowId)
        if (!cancelled) setWorkflow(next)
      } catch (err) {
        if (cancelled) return

        if (err instanceof WorkflowNotFoundError) {
          setIsNotFound(true)
          setWorkflow(null)
          return
        }

        setError("Failed to load workflow")
        setWorkflow(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [workflowId, activeOrganization?.id])

  if (!activeOrganization?.id || isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isNotFound) {
    return <WorkflowNotFoundView />
  }

  if (error || !workflow) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          {error ?? "Failed to load workflow"}
        </p>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeftIcon className="size-4" />
            Back to workflows
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <Button variant="ghost" size="sm" className="-ms-2" asChild>
            <Link href="/">
              <ArrowLeftIcon className="size-4" />
              Workflows
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-xl font-semibold">{workflow.name}</h1>
            <span className="rounded-md border px-2 py-0.5 text-xs capitalize text-muted-foreground">
              {workflow.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {workflow.description || "No description"}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Edit workflow"
        >
          <SettingsIcon className="size-4" />
        </Button>
      </div>

      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Workflow detail page — canvas and steps coming next.
      </div>

      <WorkflowDrawer
        workflow={workflow}
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onSaved={setWorkflow}
        onDeleted={() => router.push("/")}
      />
    </div>
  )
}
