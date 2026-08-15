"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2Icon } from "lucide-react"
import { useState } from "react"

interface SwitchOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationName: string
  onConfirm: () => Promise<void>
}

export function SwitchOrganizationDialog({
  open,
  onOpenChange,
  organizationName,
  onConfirm,
}: SwitchOrganizationDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch organization</DialogTitle>
          <DialogDescription>
            This workflow belongs to{" "}
            <span className="font-medium text-foreground">
              {organizationName}
            </span>
            . Switch to that organization to open it?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            Switch organization
            {isLoading ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : null}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
