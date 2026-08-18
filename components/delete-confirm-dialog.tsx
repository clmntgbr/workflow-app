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

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => Promise<void>
  onDeleted: () => void
  errorMessage?: string
  className?: string
  overlayClassName?: string
  onBlocked?: (error: unknown) => boolean
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onDeleted,
  errorMessage = "Something went wrong. Please try again.",
  className,
  overlayClassName,
  onBlocked,
}: DeleteConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null)
    onOpenChange(nextOpen)
  }

  const handleDelete = async () => {
    setIsLoading(true)
    setError(null)

    const [result] = await Promise.allSettled([
      onConfirm(),
      new Promise((resolve) => setTimeout(resolve, 500)),
    ])

    setIsLoading(false)

    if (result.status === "fulfilled") {
      onDeleted()
      handleOpenChange(false)
      return
    }

    if (onBlocked?.(result.reason)) {
      handleOpenChange(false)
      return
    }

    setError(result.reason)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={className} overlayClassName={overlayClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">
            {error instanceof Error && error.message
              ? error.message
              : errorMessage}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            Delete
            {isLoading && <Loader2Icon className="h-4 w-4 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
