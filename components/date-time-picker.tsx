"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ChevronDownIcon } from "lucide-react"
import { useState } from "react"

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function getCurrentTime(): string {
  const now = new Date()
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

function parseDatetimeLocal(value?: string): {
  date: Date | undefined
  time: string
} {
  if (!value) {
    return { date: undefined, time: getCurrentTime() }
  }

  const [datePart, timePart = "00:00"] = value.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  if (!year || !month || !day) {
    return { date: undefined, time: getCurrentTime() }
  }

  const date = new Date(year, month - 1, day)
  const time =
    timePart.length === 5
      ? `${timePart}:00`
      : timePart.slice(0, 8) || getCurrentTime()

  return { date, time }
}

function toDatetimeLocal(date: Date | undefined, time: string): string {
  if (!date) return ""
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const timePart = time.length >= 5 ? time.slice(0, 5) : "00:00"
  return `${datePart}T${timePart}`
}

interface DateTimePickerProps {
  id?: string
  value?: string
  onChange: (value: string) => void
  hasError?: boolean
  errorMessage?: string
  description?: string
  label?: string
  required?: boolean
}

export function DateTimePicker({
  id = "date-time-picker",
  value,
  onChange,
  hasError = false,
  errorMessage,
  description,
  label = "Run at",
  required = false,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const { date, time } = parseDatetimeLocal(value)

  const handleDateSelect = (nextDate: Date | undefined) => {
    onChange(toDatetimeLocal(nextDate, time))
    setOpen(false)
  }

  const handleTimeChange = (nextTime: string) => {
    const normalized =
      nextTime.length === 5
        ? `${nextTime}:00`
        : nextTime || getCurrentTime()
    onChange(toDatetimeLocal(date ?? new Date(), normalized))
  }

  return (
    <div className="space-y-2">
      {label ? (
        <FieldLabel htmlFor={`${id}-date`}>
          {label}
          {required ? <span className="text-destructive">*</span> : null}
        </FieldLabel>
      ) : null}
      <div className="flex flex-row items-center gap-3">
        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor={`${id}-date`} className="sr-only">
            Date
          </FieldLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                id={`${id}-date`}
                className={cn(
                  "h-9 w-full justify-between px-3 text-sm font-normal",
                  hasError &&
                    "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
                )}
              >
                {date ? format(date, "dd/MM/yyyy") : "Select date"}
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                captionLayout="dropdown"
                defaultMonth={date}
                onSelect={handleDateSelect}
              />
            </PopoverContent>
          </Popover>
        </Field>
        <Field className="w-36 shrink-0">
          <FieldLabel htmlFor={`${id}-time`} className="sr-only">
            Time
          </FieldLabel>
          <Input
            type="time"
            id={`${id}-time`}
            step="1"
            value={time}
            onChange={(event) => handleTimeChange(event.target.value)}
            className={cn(
              "h-9 appearance-none bg-background px-3 text-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
              hasError &&
                "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
            )}
          />
        </Field>
      </div>
      {hasError && errorMessage ? (
        <p className="text-xs text-destructive">{errorMessage}</p>
      ) : description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
