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

interface SwitchProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName: string
  onConfirm: () => Promise<void>
}

export function SwitchProjectDialog({
  open,
  onOpenChange,
  projectName,
  onConfirm,
}: SwitchProjectDialogProps) {
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
          <DialogTitle>Switch project</DialogTitle>
          <DialogDescription>
            This workflow belongs to{" "}
            <span className="font-medium text-foreground">{projectName}</span>.
            Switch to that project to open it?
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
            Switch project
            {isLoading ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : null}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
