"use client"

import CustomInput from "@/components/custom-input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { useProject } from "@/lib/project/context"
import {
  createProjectSchema,
  CreateProjectFormValues,
} from "@/lib/project/schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProjectDialog({
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
  const { createProject } = useProject()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "" },
  })

  useEffect(() => {
    if (open) {
      reset({ name: "" })
    }
  }, [open, reset])

  const onSubmit = async (data: CreateProjectFormValues) => {
    try {
      await createProject({ name: data.name.trim() })
      reset({ name: "" })
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create project"
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              Projects group your workflows, endpoints, and team members.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Field>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    id="create-project-name"
                    isRequired
                    label="Project name"
                    description="A short name for this project"
                    hasError={!!errors.name}
                    errorMessage={errors.name?.message}
                    value={field.value}
                    hasCharacterLimit
                    maxLength={255}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                  />
                )}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Create project
              {isSubmitting ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : null}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
