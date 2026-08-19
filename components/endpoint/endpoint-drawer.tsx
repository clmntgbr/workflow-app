"use client"

import CustomInput from "@/components/custom-input"
import CustomSwitch from "@/components/custom-switch"
import CustomTextarea from "@/components/custom-textarea"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import JsonInput from "@/components/json-input"
import { RadioDropdown } from "@/components/radio-dropdown"
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
import { getEndpoint } from "@/lib/endpoint/api"
import { useEndpoint } from "@/lib/endpoint/context"
import {
  endpointFormSchema,
  toCreateEndpointPayload,
  toUpdateEndpointPayload,
} from "@/lib/endpoint/schema"
import { Endpoint } from "@/lib/endpoint/types"
import {
  KeyValuePair,
  millisecondsToSeconds,
  recordToKeyValuePairs,
} from "@/lib/endpoint/utils"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import z from "zod"

type EndpointFormValues = z.infer<typeof endpointFormSchema>

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const

const emptyFormValues: EndpointFormValues = {
  name: "",
  description: "",
  url: "",
  method: "GET",
  body: "{}",
  headers: [],
  query: [],
  timeout: 30,
  retryOnFailure: false,
  retryCount: 0,
  retryDelay: 10,
}

function getEndpointFormValues(endpoint?: Endpoint | null): EndpointFormValues {
  if (!endpoint) return emptyFormValues

  return {
    name: endpoint.name,
    description: endpoint.description ?? "",
    url: endpoint.url,
    method: endpoint.method as EndpointFormValues["method"],
    body: JSON.stringify(endpoint.body ?? {}, null, 2),
    headers: recordToKeyValuePairs(endpoint.headers),
    query: recordToKeyValuePairs(endpoint.query),
    timeout: millisecondsToSeconds(endpoint.timeout),
    retryOnFailure: endpoint.retryOnFailure,
    retryCount: endpoint.retryCount,
    retryDelay: millisecondsToSeconds(endpoint.retryDelay),
    status: endpoint.status === "inactive" ? "inactive" : ("active" as const),
  }
}

function KeyValueEditor({
  label,
  description,
  pairs,
  onChange,
}: {
  label: string
  description: string
  pairs: KeyValuePair[]
  onChange: (pairs: KeyValuePair[]) => void
}) {
  const updatePair = (
    index: number,
    field: keyof KeyValuePair,
    value: string
  ) => {
    onChange(
      pairs.map((pair, pairIndex) =>
        pairIndex === index ? { ...pair, [field]: value } : pair
      )
    )
  }

  const addPair = () => {
    onChange([...pairs, { key: "", value: "" }])
  }

  const removePair = (index: number) => {
    onChange(pairs.filter((_, pairIndex) => pairIndex !== index))
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-2">
        {pairs.map((pair, index) => (
          <div key={`${label}-${index}`} className="flex items-center gap-2">
            <Input
              value={pair.key}
              placeholder="Key"
              onChange={(event) => updatePair(index, "key", event.target.value)}
              className="h-9"
            />
            <Input
              value={pair.value}
              placeholder="Value"
              onChange={(event) =>
                updatePair(index, "value", event.target.value)
              }
              className="h-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removePair(index)}
              aria-label="Remove entry"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addPair}>
        <PlusIcon className="size-4" />
        Add entry
      </Button>
    </div>
  )
}

interface EndpointDrawerProps {
  endpoint?: Endpoint | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (endpoint: Endpoint) => void
  onDeleted?: () => void
}

export function EndpointDrawer({
  endpoint,
  isOpen,
  onOpenChange,
  onSaved,
  onDeleted,
}: EndpointDrawerProps) {
  const {
    createEndpoint,
    updateEndpoint,
    removeEndpoint,
    setEditingEndpointId,
  } = useEndpoint()
  const isCreate = !endpoint
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [detailedEndpoint, setDetailedEndpoint] = useState<Endpoint | null>(
    null
  )

  const {
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<EndpointFormValues>({
    resolver: zodResolver(endpointFormSchema),
    defaultValues: emptyFormValues,
  })

  const retryOnFailure = useWatch({
    control,
    name: "retryOnFailure",
  })

  useEffect(() => {
    if (!isOpen) {
      setEditingEndpointId(null)
      setDetailedEndpoint(null)
      return
    }

    if (!endpoint) {
      setEditingEndpointId(null)
      setDetailedEndpoint(null)
      reset(emptyFormValues)
      return
    }

    setEditingEndpointId(endpoint.id)
    setDetailedEndpoint(endpoint)
    reset(getEndpointFormValues(endpoint))

    let cancelled = false

    void getEndpoint(endpoint.id)
      .then((full) => {
        if (cancelled) return
        setDetailedEndpoint(full)
        reset(getEndpointFormValues(full))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
    // Intentionally keyed on endpoint.id so a list refetch does not reset the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, endpoint?.id, reset, setEditingEndpointId])

  const onClose = () => {
    reset(getEndpointFormValues(detailedEndpoint ?? endpoint))
    onOpenChange(false)
  }

  const onSubmit = async (data: EndpointFormValues) => {
    setIsSaving(true)
    try {
      if (isCreate) {
        const created = await createEndpoint(toCreateEndpointPayload(data))
        onSaved?.(created)
      } else if (endpoint && data.status) {
        const updated = await updateEndpoint(
          endpoint.id,
          toUpdateEndpointPayload({
            ...data,
            status: data.status,
          })
        )
        onSaved?.(updated)
      }
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
        <DrawerContent className="flex h-full w-[80vw]! max-w-[80vw]! flex-col">
          <DrawerHeader className="sr-only">
            <DrawerTitle>
              {isCreate ? "Create Endpoint" : "Edit Endpoint"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <form
              id="endpoint-form"
              onSubmit={handleSubmit(onSubmit)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                  <div className="space-y-1">
                    <h2 className="font-semibold">General Information</h2>
                    <p className="text-sm text-muted-foreground">
                      Define the endpoint name, URL, and HTTP method.
                    </p>
                  </div>
                  <div className="flex flex-col gap-6 md:col-span-2">
                    <Field>
                      <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                          <CustomInput
                            id="endpoint-name"
                            isRequired
                            label="Name"
                            hasError={!!errors.name}
                            errorMessage={errors.name?.message}
                            description="The name of the endpoint"
                            value={field.value ?? ""}
                            hasCharacterLimit
                            maxLength={255}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </Field>
                    <Field>
                      <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                          <CustomTextarea
                            id="endpoint-description"
                            label="Description"
                            hasError={!!errors.description}
                            errorMessage={errors.description?.message}
                            description="Optional notes about this endpoint"
                            value={field.value ?? ""}
                            hasCharacterLimit
                            maxLength={2000}
                            onChange={field.onChange}
                            textareaClassName="min-h-24"
                          />
                        )}
                      />
                    </Field>
                    <Field>
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <Controller
                            name="method"
                            control={control}
                            render={({ field }) => (
                              <div className="w-[8.5rem] shrink-0 space-y-2">
                                <Label htmlFor="endpoint-method">Method</Label>
                                <RadioDropdown
                                  id="endpoint-method"
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  options={[...HTTP_METHODS]}
                                  groupLabel="HTTP method"
                                  placeholder="Method"
                                />
                                {errors.method?.message ? (
                                  <p className="text-xs text-destructive">
                                    {errors.method.message}
                                  </p>
                                ) : null}
                              </div>
                            )}
                          />
                          <Controller
                            name="url"
                            control={control}
                            render={({ field }) => (
                              <div className="min-w-0 flex-1 space-y-2">
                                <Label htmlFor="endpoint-url">
                                  URL
                                  <span className="ml-1 text-destructive">
                                    *
                                  </span>
                                </Label>
                                <Input
                                  id="endpoint-url"
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  placeholder="https://api.example.com/resource"
                                  className="h-9"
                                />
                                {errors.url ? (
                                  <p className="text-xs text-destructive">
                                    {errors.url.message}
                                  </p>
                                ) : null}
                              </div>
                            )}
                          />
                        </div>
                      </div>
                    </Field>
                  </div>
                </div>

                <Separator className="my-10" />

                <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
                  <div className="space-y-1">
                    <h2 className="font-semibold">Request</h2>
                    <p className="text-sm text-muted-foreground">
                      Configure headers and query parameters.
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
                            id="endpoint-timeout"
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
                        <Label htmlFor="endpoint-retry-on-failure">
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
                            id="endpoint-retry-on-failure"
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
                            id="endpoint-retry-count"
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
                            id="endpoint-retry-delay"
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
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {!isCreate && endpoint ? (
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
                      disabled={isSaving}
                    >
                      {isCreate ? "Create" : "Update"}
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

      {!isCreate && endpoint ? (
        <DeleteConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Delete endpoint"
          description="This action cannot be undone. The endpoint will be permanently removed."
          onConfirm={() => removeEndpoint(endpoint.id)}
          onDeleted={() => {
            onClose()
            onDeleted?.()
          }}
          errorMessage="Failed to delete endpoint. Please try again."
        />
      ) : null}
    </>
  )
}
