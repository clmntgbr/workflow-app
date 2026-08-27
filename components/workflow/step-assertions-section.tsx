"use client"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { AssertionDrawer } from "@/components/workflow/assertion-drawer"
import { deleteAssertion } from "@/lib/workflow/assertion/api"
import {
  Assertion,
  formatAssertionSummary,
} from "@/lib/workflow/assertion/types"
import { CheckCircle2, PlusIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import { Badge } from "../ui/badge"

interface StepAssertionsSectionProps {
  workflowId: string
  stepId: string
  enabled: boolean
  assertions: Assertion[]
  onAssertionsChange: (assertions: Assertion[]) => void
}

export function StepAssertionsSection({
  workflowId,
  stepId,
  enabled,
  assertions,
  onAssertionsChange,
}: StepAssertionsSectionProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingAssertion, setEditingAssertion] = useState<Assertion | null>(
    null
  )
  const [assertionToDelete, setAssertionToDelete] = useState<Assertion | null>(
    null
  )

  const openCreate = () => {
    setEditingAssertion(null)
    setIsDrawerOpen(true)
  }

  const openEdit = (assertion: Assertion) => {
    setEditingAssertion(assertion)
    setIsDrawerOpen(true)
  }

  const handleSaved = (saved: Assertion) => {
    const exists = assertions.some((assertion) => assertion.id === saved.id)
    onAssertionsChange(
      exists
        ? assertions.map((assertion) =>
            assertion.id === saved.id ? saved : assertion
          )
        : [...assertions, saved]
    )
  }

  const handleDeleted = (assertionId: string) => {
    onAssertionsChange(
      assertions.filter((assertion) => assertion.id !== assertionId)
    )
  }

  const confirmDelete = async () => {
    if (!assertionToDelete) return
    await deleteAssertion(workflowId, assertionToDelete.id)
    handleDeleted(assertionToDelete.id)
  }

  if (!enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Save the step before adding assertions.
      </p>
    )
  }

  const activeEditing =
    editingAssertion &&
    assertions.some((assertion) => assertion.id === editingAssertion.id)
      ? editingAssertion
      : null

  return (
    <div className="space-y-4">
      {assertions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No assertions yet. Add conditions on the status code, headers, or
          response body to fail the step when they are not met.
        </p>
      ) : (
        <ul className="space-y-2">
          {assertions.map((assertion) => (
            <li key={assertion.id} className="flex items-stretch gap-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-md border p-2 text-left text-xs outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => openEdit(assertion)}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md border">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">
                    {formatAssertionSummary(assertion)}
                  </span>
                  {assertion.description ? (
                    <span className="block truncate text-muted-foreground">
                      {assertion.description}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 px-1.5 py-0.5">
                  <Badge variant="secondary">{assertion.operator}</Badge>
                </span>
              </button>
              <div className="flex shrink-0 items-center rounded-md">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete assertion ${formatAssertionSummary(assertion)}`}
                  onClick={() => setAssertionToDelete(assertion)}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" size="sm" onClick={openCreate}>
        <PlusIcon className="size-4" />
        Add assertion
      </Button>

      <AssertionDrawer
        workflowId={workflowId}
        stepId={stepId}
        assertion={activeEditing}
        nested
        isOpen={
          isDrawerOpen &&
          (editingAssertion === null || Boolean(activeEditing))
        }
        onOpenChange={(open) => {
          setIsDrawerOpen(open)
          if (!open) setEditingAssertion(null)
        }}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />

      <DeleteConfirmDialog
        open={assertionToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setAssertionToDelete(null)
        }}
        title="Delete assertion"
        description="This assertion will be removed from the step. Future runs will no longer evaluate it."
        onConfirm={confirmDelete}
        onDeleted={() => setAssertionToDelete(null)}
        errorMessage="Failed to delete assertion. Please try again."
      />
    </div>
  )
}
