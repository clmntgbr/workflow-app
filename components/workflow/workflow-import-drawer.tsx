"use client"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Field } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { WorkflowFormFields } from "@/components/workflow/workflow-form-fields"
import { openSubscriptionDrawer } from "@/components/subscription-drawer-host"
import { cn } from "@/lib/utils"
import {
  importWorkflow,
  readWorkflowExportFile,
  WorkflowImportError,
  workflowImportErrorMessage,
} from "@/lib/workflow/api"
import {
  applyWorkflowFormToExport,
  emptyWorkflowFormValues,
  getWorkflowFormValuesFromExport,
  workflowSchema,
  WorkflowFormValues,
} from "@/lib/workflow/schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, UploadIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

interface WorkflowImportDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkflowImportDrawer({
  isOpen,
  onOpenChange,
}: WorkflowImportDrawerProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formSectionRef = useRef<HTMLDivElement>(null)
  const pickingFileRef = useRef(false)
  const [file, setFile] = useState<File | null>(null)
  const [exportPayload, setExportPayload] = useState<unknown>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)

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

  const isFileValid = exportPayload !== null

  const resetState = () => {
    pickingFileRef.current = false
    setFile(null)
    setExportPayload(null)
    setError(null)
    setIsDragging(false)
    setIsSaving(false)
    setFileInputKey((key) => key + 1)
    reset(emptyWorkflowFormValues)
  }

  const onClose = () => {
    resetState()
    onOpenChange(false)
  }

  const openFilePicker = () => {
    pickingFileRef.current = true
    fileInputRef.current?.click()
  }

  const handleFile = async (next: File | null) => {
    pickingFileRef.current = false
    setFile(next)
    setIsDragging(false)

    if (!next) {
      setExportPayload(null)
      setError(null)
      reset(emptyWorkflowFormValues)
      return
    }

    try {
      const payload = await readWorkflowExportFile(next)
      setExportPayload(payload)
      setError(null)
      reset(getWorkflowFormValuesFromExport(payload))
    } catch (err) {
      setExportPayload(null)
      reset(emptyWorkflowFormValues)
      const message = workflowImportErrorMessage(err)
      setError(message)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    const onWindowFocus = () => {
      window.setTimeout(() => {
        pickingFileRef.current = false
      }, 0)
    }

    window.addEventListener("focus", onWindowFocus)
    return () => window.removeEventListener("focus", onWindowFocus)
  }, [isOpen])

  useEffect(() => {
    if (!isFileValid) return
    formSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }, [isFileValid])

  const onSubmit = async (data: WorkflowFormValues) => {
    if (!exportPayload || isSaving) return

    setIsSaving(true)

    try {
      const payload = applyWorkflowFormToExport(exportPayload, data)
      const created = await importWorkflow(payload)
      onClose()
      router.push(`/workflow/${created.id}?imported=1`)
    } catch (err) {
      const message = workflowImportErrorMessage(err)
      toast.error(message)
      if (err instanceof WorkflowImportError && err.kind === "not_allowed") {
        openSubscriptionDrawer()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const onInvalidSubmit = () => {
    formSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  const dropzoneClassName = cn(
    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-muted-foreground hover:bg-accent/50",
    isFileValid ? "min-h-20" : "min-h-60",
    error
      ? "border-red-500"
      : isFileValid
        ? "border-green-500"
        : isDragging
          ? "border-ring bg-accent/50"
          : "border-border"
  )

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && pickingFileRef.current) return
        if (!open) onClose()
        else onOpenChange(true)
      }}
      direction="right"
    >
      <DrawerContent className="flex h-full min-h-0 w-[80vw]! max-w-[80vw]! flex-col overflow-hidden">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Import workflow</DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <form
            id="workflow-import-form"
            onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
              <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                <div className="space-y-1">
                  <h2 className="font-semibold">Workflow export</h2>
                  <p className="text-sm text-muted-foreground">
                    Upload a workflow export JSON file. The imported workflow is
                    created active; its schedule comes from the file.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Field>
                    <div className="flex flex-col gap-2">
                      <div
                        className={dropzoneClassName}
                        onClick={openFilePicker}
                        onDragOver={(event) => {
                          event.preventDefault()
                          setIsDragging(true)
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(event) => {
                          event.preventDefault()
                          const dropped = event.dataTransfer.files[0]
                          if (dropped) void handleFile(dropped)
                          else setIsDragging(false)
                        }}
                      >
                        <UploadIcon
                          className={cn(
                            "size-6",
                            error
                              ? "text-red-600"
                              : isFileValid
                                ? "text-green-600"
                                : "text-muted-foreground"
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm",
                            error
                              ? "text-red-600"
                              : isFileValid
                                ? "text-green-600"
                                : "text-muted-foreground"
                          )}
                        >
                          {file ? file.name : "Click or drop a JSON export"}
                        </span>
                      </div>
                      <input
                        key={fileInputKey}
                        ref={fileInputRef}
                        id="workflow-import-file"
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={(event) =>
                          void handleFile(event.target.files?.[0] ?? null)
                        }
                      />
                      {error ? (
                        <p className="text-xs text-red-500">{error}</p>
                      ) : null}
                    </div>
                  </Field>
                </div>
              </div>

              {isFileValid ? (
                <div ref={formSectionRef}>
                  <Separator className="my-10" />
                  <WorkflowFormFields
                    control={control}
                    errors={errors}
                    setValue={setValue}
                    idPrefix="workflow-import"
                  />
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t bg-background px-6 py-4">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!isFileValid || isSaving}>
                  Import workflow
                  {isSaving ? (
                    <Loader2Icon className="ml-2 size-4 animate-spin" />
                  ) : null}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
