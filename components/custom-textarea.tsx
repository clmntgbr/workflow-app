"use client"

import { FieldDescription } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ChangeEvent, useId } from "react"

interface CustomTextareaProps {
  id?: string
  isRequired?: boolean
  label: string
  description: string
  value: string
  maxLength?: number
  hasCharacterLimit?: boolean
  onChange: (value: string) => void
  hasError?: boolean
  errorMessage?: string
  className?: string
  textareaClassName?: string
}

export default function CustomTextarea({
  id,
  isRequired = false,
  label,
  description,
  value,
  maxLength = 0,
  onChange,
  hasCharacterLimit = false,
  hasError = false,
  errorMessage,
  className,
  textareaClassName,
}: CustomTextareaProps) {
  const generatedId = useId()
  const resolvedId = id ?? generatedId
  const characterCount = value.length

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (maxLength > 0 && e.target.value.length > maxLength) return
    onChange(e.target.value)
  }

  return (
    <div className={cn("w-full space-y-2", className)}>
      <Label htmlFor={resolvedId}>
        {label}
        {isRequired && <span className="text-destructive">*</span>}
      </Label>
      <Textarea
        id={resolvedId}
        value={value}
        maxLength={maxLength > 0 ? maxLength : undefined}
        onChange={handleChange}
        className={cn(
          "peer bg-white pr-14 dark:bg-background",
          hasError &&
            "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30",
          textareaClassName
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
