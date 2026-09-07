"use client"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { WorkflowFormFields } from "@/components/workflow/workflow-form-fields"
import { getWorkflow } from "@/lib/workflow/api"
import { useWorkflow } from "@/lib/workflow/context"
import {
  emptyWorkflowFormValues,
  getWorkflowFormValues,
  toCreateWorkflowPayload,
  toUpdateWorkflowPayload,
  workflowSchema,
  WorkflowFormValues,
} from "@/lib/workflow/schema"
import { Workflow } from "@/lib/workflow/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

interface WorkflowDrawerProps {
  workflow?: Workflow | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (workflow: Workflow) => void
  onDeleted?: () => void
}

export function WorkflowDrawer({
  workflow,
  isOpen,
  onOpenChange,
  onSaved,
  onDeleted,
}: WorkflowDrawerProps) {
  const { createWorkflow, updateWorkflow, removeWorkflow } = useWorkflow()
  const isCreate = !workflow

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [detailedWorkflow, setDetailedWorkflow] = useState<Workflow | null>(
    null
  )

  const {
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowSchema),
    defaultValues: emptyWorkflowFormValues,
  })

  const activeWorkflow = detailedWorkflow ?? workflow

  useEffect(() => {
    if (!isOpen) {
      setDetailedWorkflow(null)
      return
    }

    if (!workflow) {
      setDetailedWorkflow(null)
      reset(emptyWorkflowFormValues)
      return
    }

    setDetailedWorkflow(workflow)
    reset(getWorkflowFormValues(workflow))

    let cancelled = false

    void getWorkflow(workflow.id)
      .then((full) => {
        if (cancelled) return
        setDetailedWorkflow(full)
        reset(getWorkflowFormValues(full))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
    // Intentionally keyed on workflow.id so a list refetch does not reset the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, workflow?.id, reset])

  const onClose = () => {
    reset(getWorkflowFormValues(activeWorkflow))
    onOpenChange(false)
  }

  const onSubmit = async (data: WorkflowFormValues) => {
    setIsSaving(true)
    try {
      if (isCreate) {
        const created = await createWorkflow(toCreateWorkflowPayload(data))
        onSaved?.(created)
      } else if (activeWorkflow) {
        const updated = await updateWorkflow(
          activeWorkflow.id,
          toUpdateWorkflowPayload(data, {
            status: activeWorkflow.status,
            concurrency: activeWorkflow.concurrency,
          })
        )
        onSaved?.(updated)
      }
      onClose()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save workflow"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const onInvalidSubmit = () => {
    const form = document.getElementById("workflow-form")
    form
      ?.querySelector("[aria-invalid='true']")
      ?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
        <DrawerContent className="flex h-full w-[80vw]! max-w-[80vw]! flex-col">
          <DrawerHeader className="sr-only">
            <DrawerTitle>
              {isCreate ? "Create Workflow" : "Edit Workflow"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <form
              id="workflow-form"
              onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
                <WorkflowFormFields
                  control={control}
                  errors={errors}
                  setValue={setValue}
                  nextRunAt={
                    isCreate ? null : (activeWorkflow?.nextRunAt ?? null)
                  }
                />
              </div>

              <div className="shrink-0 border-t bg-background px-6 py-4">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {!isCreate && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setIsDeleteOpen(true)}
                        disabled={isSaving}
                      >
                        <Trash2Icon className="h-4 w-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={onClose}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="w-full sm:w-auto"
                      disabled={isSaving}
                    >
                      {isCreate ? "Create" : "Update"}
                      {isSaving && (
                        <Loader2Icon className="ml-2 h-4 w-4 animate-spin" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
      {!isCreate && activeWorkflow && (
        <DeleteConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Delete workflow"
          description="This action cannot be undone. The workflow will be permanently removed."
          onConfirm={() => removeWorkflow(activeWorkflow.id)}
          onDeleted={() => {
            onClose()
            onDeleted?.()
          }}
          errorMessage="Failed to delete workflow. Please try again."
        />
      )}
    </>
  )
}
