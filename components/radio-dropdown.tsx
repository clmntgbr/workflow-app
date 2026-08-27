"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "lucide-react"

type RadioDropdownProps<T> = {
  options: T[]
  value: T | null
  onValueChange: (value: T) => void
  getValue?: (option: T) => string
  getLabel?: (option: T) => React.ReactNode
  isOptionDisabled?: (option: T) => boolean
  placeholder?: string
  groupLabel?: string
  disabled?: boolean
  id?: string
  className?: string
  triggerClassName?: string
  contentClassName?: string
  modal?: boolean
}

function defaultGetValue<T>(option: T): string {
  if (typeof option === "string" || typeof option === "number") {
    return String(option)
  }
  throw new Error("RadioDropdown: pass getValue when options are not strings")
}

function defaultGetLabel<T>(option: T): React.ReactNode {
  if (typeof option === "string" || typeof option === "number") {
    return String(option)
  }
  throw new Error("RadioDropdown: pass getLabel when options are not strings")
}

export function RadioDropdown<T>({
  options,
  value,
  onValueChange,
  getValue = defaultGetValue,
  getLabel = defaultGetLabel,
  isOptionDisabled,
  placeholder = "Select…",
  groupLabel,
  disabled = false,
  id,
  className,
  triggerClassName,
  contentClassName,
  modal = true,
}: RadioDropdownProps<T>) {
  const selectedValue = value == null ? "" : getValue(value)
  const selectedLabel = value == null ? null : getLabel(value)

  const handleValueChange = (next: string) => {
    const option = options.find((item) => getValue(item) === next)
    if (option !== undefined) onValueChange(option)
  }

  return (
    <DropdownMenu modal={modal}>
      <DropdownMenuTrigger asChild disabled={disabled} className={className}>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between border border-input bg-transparent px-3 font-normal text-sm shadow-xs",
            "hover:bg-transparent hover:text-foreground",
            "aria-expanded:bg-transparent aria-expanded:text-foreground",
            triggerClassName
          )}
        >
          <span className="min-w-0 truncate">
            {selectedLabel ?? placeholder}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className={contentClassName}>
        {groupLabel ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{groupLabel}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuRadioGroup
          value={selectedValue}
          onValueChange={handleValueChange}
        >
          {options.map((option) => {
            const optionValue = getValue(option)
            return (
              <DropdownMenuRadioItem
                key={optionValue}
                value={optionValue}
                disabled={isOptionDisabled?.(option)}
              >
                {getLabel(option)}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
