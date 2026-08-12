"use client"

import CustomInput from "@/components/custom-input"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Field } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { useEndpoint } from "@/lib/endpoint/context"
import { CanvasStep } from "@/components/workflow/step-node"
import { Loader2Icon } from "lucide-react"
import { useEffect, useState } from "react"

interface StepDrawerProps {
  step: CanvasStep | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: { name: string; endpointId: string }) => Promise<void>
}

export function StepDrawer({
  step,
  isOpen,
  onOpenChange,
  onSave,
}: StepDrawerProps) {
  const { endpoints } = useEndpoint()
  const [name, setName] = useState("")
  const [endpointId, setEndpointId] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen || !step) return
    setName(step.name)
    setEndpointId(step.endpointId)
  }, [isOpen, step])

  const handleClose = () => onOpenChange(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!step || !name.trim() || !endpointId) return

    setIsSaving(true)
    try {
      await onSave({ name: name.trim(), endpointId })
      handleClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="flex h-full w-[480px]! max-w-[90vw]! flex-col">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Edit Step</DrawerTitle>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-6 overflow-auto px-6 py-8">
            <div className="space-y-1">
              <h2 className="font-semibold">Edit Step</h2>
              <p className="text-sm text-muted-foreground">
                Update the step name and linked endpoint.
              </p>
            </div>

            <Field>
              <CustomInput
                id="step-name"
                isRequired
                label="Name"
                description="Displayed name of the step"
                value={name}
                onChange={setName}
                hasCharacterLimit
                maxLength={255}
              />
            </Field>

            <Field>
              <div className="space-y-2">
                <Label htmlFor="step-endpoint">Endpoint</Label>
                <select
                  id="step-endpoint"
                  value={endpointId}
                  onChange={(event) => setEndpointId(event.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  {endpoints.members.map((endpoint) => (
                    <option key={endpoint.id} value={endpoint.id}>
                      {endpoint.method} · {endpoint.name}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </div>

          <div className="shrink-0 border-t bg-background px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !name.trim()}>
                Update
                {isSaving ? (
                  <Loader2Icon className="ml-2 h-4 w-4 animate-spin" />
                ) : null}
              </Button>
            </div>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
