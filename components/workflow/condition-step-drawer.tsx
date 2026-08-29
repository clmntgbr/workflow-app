"use client"

import CustomInput from "@/components/custom-input"
import CustomTextarea from "@/components/custom-textarea"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Field } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { ConditionExpressionField } from "@/components/workflow/condition-expression-field"
import { CanvasStep } from "@/components/workflow/step-node"
import { validateConditionExpression } from "@/lib/workflow/step-validation"
import { Loader2Icon, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"

interface ConditionStepDrawerProps {
  workflowId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  step?: CanvasStep | null
  onSave: (input: {
    name: string
    description: string
    expression: string
  }) => Promise<void>
  onDelete?: (stepId: string) => Promise<void>
}

function getConditionFormValues(step?: CanvasStep | null) {
  return {
    name: step?.name ?? "Condition",
    description: step?.description ?? "",
    expression: step?.expression ?? "true",
  }
}

export function ConditionStepDrawer({
  workflowId,
  isOpen,
  onOpenChange,
  step,
  onSave,
  onDelete,
}: ConditionStepDrawerProps) {
  const [displayStep, setDisplayStep] = useState<CanvasStep | null>(
    step ?? null
  )
  const isReady = Boolean(displayStep && !displayStep.id.startsWith("temp-"))
  const [name, setName] = useState("Condition")
  const [description, setDescription] = useState("")
  const [expression, setExpression] = useState("true")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  useEffect(() => {
    if (step) setDisplayStep(step)
  }, [step])

  useEffect(() => {
    if (!isOpen || !step) return

    const values = getConditionFormValues(step)
    setName(values.name)
    setDescription(values.description)
    setExpression(values.expression)
    setError(null)
    setIsSaving(false)
  }, [isOpen, step])

  const onClose = () => {
    const values = getConditionFormValues(displayStep)
    setName(values.name)
    setDescription(values.description)
    setExpression(values.expression)
    setError(null)
    onOpenChange(false)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const validationError = validateConditionExpression(expression)
    if (validationError) {
      setError(validationError)
      return
    }
    if (!name.trim()) {
      setError("Name is required")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        expression: expression.trim(),
      })
      onClose()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save condition step"
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (!displayStep) return null

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
        <DrawerContent
          className="z-90 flex h-full w-[80vw]! max-w-[80vw]! flex-col"
          overlayClassName="z-85"
        >
          <DrawerHeader className="sr-only">
            <DrawerTitle>Edit condition</DrawerTitle>
          </DrawerHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <form
              id="condition-step-form"
              onSubmit={(event) => void handleSubmit(event)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                  <div className="space-y-1">
                    <h2 className="font-semibold">General Information</h2>
                    <p className="text-sm text-muted-foreground">
                      Define the step name and optional description.
                    </p>
                  </div>

                  <div className="flex flex-col gap-6 md:col-span-2">
                    <Field>
                      <CustomInput
                        id="condition-step-name"
                        isRequired
                        label="Name"
                        hasError={!!error && !name.trim()}
                        errorMessage={
                          !name.trim() ? (error ?? undefined) : undefined
                        }
                        description="The name of the step"
                        value={name}
                        hasCharacterLimit
                        maxLength={255}
                        onChange={setName}
                      />
                    </Field>

                    <Field>
                      <CustomTextarea
                        id="condition-step-description"
                        label="Description"
                        description="Optional notes about this step"
                        value={description}
                        hasCharacterLimit
                        maxLength={2000}
                        onChange={setDescription}
                        textareaClassName="min-h-24"
                      />
                    </Field>
                  </div>
                </div>

                <Separator className="my-10" />

                <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                  <div className="space-y-1">
                    <h2 className="font-semibold">Condition</h2>
                    <p className="text-sm text-muted-foreground">
                      Build a boolean expression to choose between the true and
                      false branches. Use variables from ancestor steps.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <ConditionExpressionField
                      value={expression}
                      onChange={setExpression}
                      workflowId={workflowId}
                      stepId={displayStep.id}
                      disabled={!isReady}
                      error={error}
                    />
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t bg-background px-6 py-4">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {onDelete ? (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setIsDeleteOpen(true)}
                        disabled={isSaving}
                      >
                        <Trash2Icon className="h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
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
                      disabled={isSaving || !isReady}
                    >
                      Update
                      {isSaving ? (
                        <Loader2Icon className="ml-2 h-4 w-4 animate-spin" />
                      ) : null}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </DrawerContent>
      </Drawer>

      {onDelete ? (
        <DeleteConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Delete step"
          description="This action cannot be undone. The step and its connections will be removed."
          onConfirm={() => onDelete(displayStep.id)}
          onDeleted={onClose}
          errorMessage="Failed to delete step. Please try again."
        />
      ) : null}
    </>
  )
}
