"use client"

import CustomInput from "@/components/custom-input"
import { RadioDropdown } from "@/components/radio-dropdown"
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
import { Label } from "@/components/ui/label"
import { CanvasStep } from "@/components/workflow/step-node"
import {
  DELAY_DURATION_UNITS,
  DelayDurationUnit,
  delayPartsToSeconds,
  secondsToDelayParts,
} from "@/lib/workflow/delay"
import { validateDelayDurationSeconds } from "@/lib/workflow/step-validation"
import { Loader2Icon, TimerIcon } from "lucide-react"
import { useEffect, useState } from "react"

interface DelayStepModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  step?: CanvasStep | null
  onSave: (delayDurationSeconds: number) => Promise<void>
}

export function DelayStepModal({
  open,
  onOpenChange,
  step,
  onSave,
}: DelayStepModalProps) {
  const isReady = Boolean(step && !step.id.startsWith("temp-"))
  const [durationValue, setDurationValue] = useState("1")
  const [durationUnit, setDurationUnit] = useState<DelayDurationUnit>("minute")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    const seconds = step?.delayDurationSeconds ?? 60
    const parts = secondsToDelayParts(seconds)
    setDurationValue(String(parts.value))
    setDurationUnit(parts.unit)
    setError(null)
    setIsSaving(false)
  }, [open, step])

  const handleSave = async () => {
    const parsedValue = Number.parseInt(durationValue || "0", 10)
    const delayDurationSeconds = delayPartsToSeconds(parsedValue, durationUnit)
    const validationError = validateDelayDurationSeconds(delayDurationSeconds)

    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave(delayDurationSeconds)
      onOpenChange(false)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save delay step"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[100] sm:max-w-md"
        overlayClassName="z-[95]"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TimerIcon className="size-4 text-violet-600" />
            Edit delay
          </DialogTitle>
          <DialogDescription>
            Configure how long the workflow waits before continuing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <CustomInput
              id="delay-duration-value"
              isRequired
              label="Duration"
              hasError={!!error}
              errorMessage={error ?? undefined}
              description="Minimum 1 second"
              value={durationValue}
              onChange={setDurationValue}
            />
          </Field>
          <Field>
            <div className="space-y-2">
              <Label htmlFor="delay-duration-unit">Unit</Label>
              <RadioDropdown
                id="delay-duration-unit"
                modal={false}
                contentClassName="z-[110]"
                value={
                  DELAY_DURATION_UNITS.find(
                    (unit) => unit.value === durationUnit
                  ) ?? DELAY_DURATION_UNITS[1]
                }
                onValueChange={(unit) => setDurationUnit(unit.value)}
                options={DELAY_DURATION_UNITS}
                getValue={(unit) => unit.value}
                getLabel={(unit) => unit.label}
                groupLabel="Duration unit"
                placeholder="Select unit"
              />
            </div>
          </Field>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !isReady}
          >
            {isSaving ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
