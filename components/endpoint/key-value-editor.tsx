"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HeaderAutocompleteField } from "@/components/workflow/header-autocomplete-field"
import { HeaderValueAutocompleteField } from "@/components/workflow/header-value-autocomplete-field"
import { KeyValuePair } from "@/lib/endpoint/utils"
import { PlusIcon, Trash2Icon } from "lucide-react"

export function KeyValueEditor({
  label,
  description,
  pairs,
  onChange,
  enableHeaderSuggestions = false,
}: {
  label: string
  description: string
  pairs: KeyValuePair[]
  onChange: (pairs: KeyValuePair[]) => void
  enableHeaderSuggestions?: boolean
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
            {enableHeaderSuggestions ? (
              <HeaderAutocompleteField
                value={pair.key}
                onChange={(value) => updatePair(index, "key", value)}
                placeholder="Key"
                className="h-9"
                wrapperClassName="flex-1"
              />
            ) : (
              <Input
                value={pair.key}
                placeholder="Key"
                onChange={(event) => updatePair(index, "key", event.target.value)}
                className="h-9"
              />
            )}
            {enableHeaderSuggestions ? (
              <HeaderValueAutocompleteField
                value={pair.value}
                onChange={(value) => updatePair(index, "value", value)}
                placeholder="Value"
                className="h-9"
                wrapperClassName="flex-1"
              />
            ) : (
              <Input
                value={pair.value}
                placeholder="Value"
                onChange={(event) =>
                  updatePair(index, "value", event.target.value)
                }
                className="h-9 flex-1"
              />
            )}
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
