"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldDescription } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { ChangeEvent, useId } from "react"

interface CustomInputProps {
  id?: string
  isRequired?: boolean
  label: string
  description: string
  value: string
  maxLength?: number
  hasCharacterLimit?: boolean
  errorMessage?: string
  hasError?: boolean
  disabled?: boolean
  onChange: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
}

export default function CustomInput({
  id,
  isRequired = false,
  label,
  description,
  value,
  maxLength = 0,
  errorMessage,
  onChange,
  hasCharacterLimit = false,
  hasError = false,
  disabled = false,
  onFocus,
  onBlur,
}: CustomInputProps) {
  const generatedId = useId()
  const resolvedId = id ?? generatedId
  const characterCount = value.length

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (
      hasCharacterLimit &&
      maxLength > 0 &&
      e.target.value.length > maxLength
    ) {
      return
    }
    onChange(e.target.value)
  }

  return (
    <div className="w-full space-y-2">
      <Label htmlFor={resolvedId}>
        {label}
        {isRequired && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={resolvedId}
        value={value}
        maxLength={hasCharacterLimit && maxLength > 0 ? maxLength : undefined}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        className={cn(
          "peer h-9 bg-white pr-14 shadow-none dark:bg-background",
          hasError &&
            "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
        )}
      />
      <div className="flex w-full flex-row items-start justify-between gap-2">
        <FieldDescription
          className={cn(
            "min-w-0 flex-1 text-xs text-muted-foreground",
            hasError && "text-red-500"
          )}
        >
          {hasError ? errorMessage : description}
        </FieldDescription>
        {hasCharacterLimit && (
          <FieldDescription className="min-w-0 flex-1 text-end text-xs text-muted-foreground">
            <span>{maxLength - characterCount}</span> characters left
          </FieldDescription>
        )}
      </div>
    </div>
  )
}
