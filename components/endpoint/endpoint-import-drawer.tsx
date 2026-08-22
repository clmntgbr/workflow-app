"use client"

import CustomInput from "@/components/custom-input"
import CustomSwitch from "@/components/custom-switch"
import { KeyValueEditor } from "@/components/endpoint/key-value-editor"
import JsonInput from "@/components/json-input"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { importEndpoints } from "@/lib/endpoint/api"
import {
  OPENAPI_MAX_FILE_BYTES,
  parseOpenApiFile,
} from "@/lib/endpoint/openapi"
import {
  ImportEndpointFormValues,
  importEndpointSchema,
  toImportEndpointsPayload,
} from "@/lib/endpoint/schema"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, UploadIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

const emptyFormValues: ImportEndpointFormValues = {
  file: undefined as unknown as File,
  baseURL: "",
  status: "active",
  body: "{}",
  headers: [],
  query: [],
  timeout: 30,
  retryOnFailure: false,
  retryCount: 0,
  retryDelay: 10,
}

interface EndpointImportDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function EndpointImportDrawer({
  isOpen,
  onOpenChange,
}: EndpointImportDrawerProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isFileValid, setIsFileValid] = useState<boolean | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [wasOpen, setWasOpen] = useState(false)

  const {
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<ImportEndpointFormValues>({
    resolver: zodResolver(importEndpointSchema),
    defaultValues: emptyFormValues,
  })

  const retryOnFailure = useWatch({
    control,
    name: "retryOnFailure",
  })

  if (isOpen && !wasOpen) {
    setWasOpen(true)
    reset(emptyFormValues)
    setIsFileValid(null)
    setFileInputKey((key) => key + 1)
    setIsSaving(false)
  } else if (!isOpen && wasOpen) {
    setWasOpen(false)
  }

  const onClose = () => {
    reset(emptyFormValues)
    setIsFileValid(null)
    setFileInputKey((key) => key + 1)
    onOpenChange(false)
  }

  const handleFileSelect = async (
    file: File | null,
    onChange: (file: File | null) => void
  ) => {
    if (!file) {
      onChange(null)
      setIsFileValid(null)
      return
    }

    onChange(file)

    if (file.size > OPENAPI_MAX_FILE_BYTES) {
      setIsFileValid(null)
      return
    }

    const parsed = await parseOpenApiFile(file)
    setIsFileValid(parsed.valid)

    if (parsed.valid && parsed.baseURL) {
      setValue("baseURL", parsed.baseURL, { shouldValidate: true })
    }
  }

  const onSubmit = async (data: ImportEndpointFormValues) => {
    if (isFileValid !== true) {
      if (data.file instanceof File) setIsFileValid(false)
      return
    }

    setIsSaving(true)

    try {
      await importEndpoints(data.file, toImportEndpointsPayload(data))
      onClose()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import endpoints"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="flex h-full w-[80vw]! max-w-[80vw]! flex-col">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Import endpoints</DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <form
            id="endpoint-import-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
              <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                <div className="space-y-1">
                  <h2 className="font-semibold">OpenAPI file</h2>
                  <p className="text-sm text-muted-foreground">
                    Upload an OpenAPI 3 JSON file. Each operation becomes an
                    endpoint.
                  </p>
                </div>
                <div className="flex flex-col gap-6 md:col-span-2">
                  <Field>
                    <Controller
                      name="file"
                      control={control}
                      render={({ field }) => (
                        <div className="flex flex-col gap-2">
                          <div
                            className={cn(
                              "flex min-h-60 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-muted-foreground hover:bg-accent/50",
                              errors.file || isFileValid === false
                                ? "border-red-500"
                                : isFileValid === true
                                  ? "border-green-500"
                                  : "border-border"
                            )}
                            onClick={() =>
                              document
                                .getElementById("endpoint-import-file")
                                ?.click()
                            }
                          >
                            <UploadIcon
                              className={cn(
                                "size-6",
                                isFileValid === true
                                  ? "text-green-600"
                                  : isFileValid === false
                                    ? "text-red-600"
                                    : "text-muted-foreground"
                              )}
                            />
                            <span
                              className={cn(
                                "text-sm",
                                isFileValid === true
                                  ? "text-green-600"
                                  : isFileValid === false
                                    ? "text-red-600"
                                    : "text-muted-foreground"
                              )}
                            >
                              {field.value instanceof File
                                ? field.value.name
                                : "Click to select a file"}
                            </span>
                          </div>
                          <input
                            key={fileInputKey}
                            id="endpoint-import-file"
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={(e) =>
                              void handleFileSelect(
                                e.target.files?.[0] ?? null,
                                field.onChange
                              )
                            }
                          />
                          {errors.file?.message && (
                            <p className="text-xs text-red-500">
                              {errors.file.message}
                            </p>
                          )}
                          {isFileValid === false && (
                            <p className="text-xs text-red-500">
                              Invalid OpenAPI or Swagger JSON file.
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </Field>
                </div>
              </div>

              <Separator className="my-10" />

              <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                <div className="space-y-1">
                  <h2 className="font-semibold">General Information</h2>
                  <p className="text-sm text-muted-foreground">
                    Base URL applied as a prefix to every imported path.
                  </p>
                </div>
                <div className="flex flex-col gap-6 md:col-span-2">
                  <Field>
                    <Controller
                      name="baseURL"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label htmlFor="endpoint-import-base-url">
                            Base URL
                            <span className="ml-1 text-destructive">*</span>
                          </Label>
                          <Input
                            id="endpoint-import-base-url"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            placeholder="https://api.example.com"
                            className="h-9"
                          />
                          {errors.baseURL ? (
                            <p className="text-xs text-destructive">
                              {errors.baseURL.message}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Prefix for every path in the specification
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </Field>
                </div>
              </div>

              <Separator className="my-10" />

              <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                <div className="space-y-1">
                  <h2 className="font-semibold">Request</h2>
                  <p className="text-sm text-muted-foreground">
                    Applied to every imported endpoint.
                  </p>
                </div>
                <div className="flex flex-col gap-6 md:col-span-2">
                  <Controller
                    name="headers"
                    control={control}
                    render={({ field }) => (
                      <KeyValueEditor
                        label="Headers"
                        description="Optional HTTP headers"
                        pairs={field.value ?? []}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="query"
                    control={control}
                    render={({ field }) => (
                      <KeyValueEditor
                        label="Query"
                        description="Optional query string parameters"
                        pairs={field.value ?? []}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Field>
                    <Controller
                      name="body"
                      control={control}
                      render={({ field }) => (
                        <JsonInput
                          data={field.value ?? "{}"}
                          title="Body"
                          editable
                          onTextChange={field.onChange}
                          editorClassName="min-h-40"
                        />
                      )}
                    />
                    {errors.body ? (
                      <p className="text-xs text-destructive">
                        {errors.body.message}
                      </p>
                    ) : null}
                  </Field>
                </div>
              </div>

              <Separator className="my-10" />

              <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                <div className="space-y-1">
                  <h2 className="font-semibold">Execution</h2>
                  <p className="text-sm text-muted-foreground">
                    Timeout and retry settings in seconds.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-2">
                  <Field>
                    <Controller
                      name="timeout"
                      control={control}
                      render={({ field }) => (
                        <CustomInput
                          id="endpoint-import-timeout"
                          isRequired
                          label="Timeout (s)"
                          hasError={!!errors.timeout}
                          errorMessage={errors.timeout?.message}
                          description="Minimum 30 seconds"
                          value={String(field.value ?? 0)}
                          onChange={(value) =>
                            field.onChange(Number.parseInt(value || "0", 10))
                          }
                        />
                      )}
                    />
                  </Field>
                  <div
                    className={cn(
                      "flex flex-row items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-900"
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <Label htmlFor="endpoint-import-retry-on-failure">
                        Retry on failure
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Retry the request when it fails
                      </p>
                    </div>
                    <Controller
                      name="retryOnFailure"
                      control={control}
                      render={({ field }) => (
                        <CustomSwitch
                          id="endpoint-import-retry-on-failure"
                          value={field.value ?? false}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                  <Field>
                    <Controller
                      name="retryCount"
                      control={control}
                      render={({ field }) => (
                        <CustomInput
                          id="endpoint-import-retry-count"
                          isRequired
                          label="Retry count"
                          hasError={!!errors.retryCount}
                          errorMessage={errors.retryCount?.message}
                          description="Number of retries"
                          value={String(field.value ?? 0)}
                          disabled={!retryOnFailure}
                          onChange={(value) =>
                            field.onChange(Number.parseInt(value || "0", 10))
                          }
                        />
                      )}
                    />
                  </Field>
                  <Field>
                    <Controller
                      name="retryDelay"
                      control={control}
                      render={({ field }) => (
                        <CustomInput
                          id="endpoint-import-retry-delay"
                          isRequired
                          label="Retry delay (s)"
                          hasError={!!errors.retryDelay}
                          errorMessage={errors.retryDelay?.message}
                          description="Minimum 10 seconds"
                          value={String(field.value ?? 0)}
                          disabled={!retryOnFailure}
                          onChange={(value) =>
                            field.onChange(Number.parseInt(value || "0", 10))
                          }
                        />
                      )}
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t bg-background px-6 py-4">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
                    Import
                    {isSaving ? (
                      <Loader2Icon className="ml-2 h-4 w-4 animate-spin" />
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
