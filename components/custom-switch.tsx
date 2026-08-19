"use client"

import { FieldDescription } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { CheckIcon, XIcon } from "lucide-react"
import { useId } from "react"

interface CustomSwitchProps {
  id?: string
  isRequired?: boolean
  isDisabled?: boolean
  label?: string | null
  description?: string | null
  value: boolean
  errorMessage?: string
  hasError?: boolean
  onChange: (value: boolean) => void
}

export default function CustomSwitch({
  id,
  isRequired = false,
  isDisabled = false,
  label = null,
  description = null,
  value,
  errorMessage,
  onChange,
  hasError = false,
}: CustomSwitchProps) {
  const generatedId = useId()
  const resolvedId = id ?? generatedId
  const showLabel = Boolean(label)
  const showDescription = Boolean(description)

  const handleCheckedChange = (next: boolean) => {
    onChange(next)
  }

  const switchElement = (
    <div>
      <div className="relative inline-grid h-7 grid-cols-[1fr_1fr] items-center text-sm font-medium">
        <Switch
          id={resolvedId}
          checked={value}
          disabled={isDisabled}
          onCheckedChange={handleCheckedChange}
          className="peer absolute inset-0 data-[size=default]:h-[inherit] data-[size=default]:w-14 data-[state=unchecked]:bg-input/50 [&_span]:z-10 [&_span]:transition-transform [&_span]:duration-300 [&_span]:ease-[cubic-bezier(0.16,1,0.3,1)] [&_span]:group-data-[size=default]/switch:size-6.5 [&_span]:data-[state=checked]:translate-x-7 [&_span]:data-[state=checked]:rtl:-translate-x-7"
          aria-label={
            showLabel ? undefined : "Switch with permanent icon indicators"
          }
        />
        <span className="pointer-events-none relative ml-0.5 flex min-w-8 items-center justify-center text-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] peer-data-[state=checked]:invisible peer-data-[state=unchecked]:translate-x-6 peer-data-[state=unchecked]:rtl:-translate-x-6">
          <XIcon className="size-4" aria-hidden="true" />
        </span>
        <span className="pointer-events-none relative flex min-w-8 items-center justify-center text-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] peer-data-[state=checked]:-translate-x-full peer-data-[state=checked]:text-background peer-data-[state=unchecked]:invisible peer-data-[state=checked]:rtl:translate-x-full">
          <CheckIcon className="size-4" aria-hidden="true" />
        </span>
      </div>
    </div>
  )

  if (!showLabel && !showDescription) {
    return switchElement
  }

  return (
    <div className="w-full space-y-2">
      {showLabel && (
        <Label htmlFor={resolvedId} className="mb-1">
          {label}
          {isRequired && <span className="text-destructive">*</span>}
        </Label>
      )}
      {switchElement}
      {showDescription && (
        <div className="flex w-full flex-row items-start justify-between gap-2">
          <FieldDescription
            className={cn(
              "min-w-0 flex-1 text-xs text-muted-foreground",
              hasError && "text-red-500"
            )}
          >
            {hasError ? errorMessage : description}
          </FieldDescription>
        </div>
      )}
    </div>
  )
}
