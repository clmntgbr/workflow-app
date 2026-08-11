"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useOrganization } from "@/lib/organization/context"
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react"
import * as React from "react"

export function OrganizationSwitcher() {
  const {
    organizations,
    activeOrganization,
    isLoading,
    activateOrganization,
    createOrganization,
  } = useOrganization()
  const [isPending, setIsPending] = React.useState(false)

  const handleActivate = async (organizationId: string) => {
    if (organizationId === activeOrganization?.id || isPending) return
    try {
      setIsPending(true)
      await activateOrganization(organizationId)
    } finally {
      setIsPending(false)
    }
  }

  const handleCreate = async () => {
    const name = window.prompt("Organization name")
    if (!name?.trim()) return

    try {
      setIsPending(true)
      await createOrganization({ name: name.trim() })
    } finally {
      setIsPending(false)
    }
  }

  if (isLoading && !activeOrganization) {
    return <Skeleton className="h-9 w-44" />
  }

  if (!activeOrganization && organizations.length === 0) {
    return (
      <Button
        variant="outline"
        size="lg"
        className="gap-2"
        onClick={handleCreate}
        disabled={isPending}
      >
        <Plus className="size-4" />
        Create organization
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="min-w-44 justify-between gap-2 data-[state=open]:bg-muted"
          disabled={isPending}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="size-3.5" />
            </span>
            <span className="truncate font-medium">
              {activeOrganization?.name ?? "Select organization"}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        align="start"
        sideOffset={4}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Organizations
        </DropdownMenuLabel>
        {organizations.map((organization) => (
          <DropdownMenuItem
            key={organization.id}
            onClick={() => handleActivate(organization.id)}
            className="gap-2 p-2"
          >
            <span className="flex size-6 items-center justify-center rounded-md border">
              <Building2 className="size-3.5 shrink-0" />
            </span>
            <span className="flex-1 truncate">{organization.name}</span>
            {organization.isActive ? (
              <Check className="size-4 shrink-0" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 p-2"
          onClick={handleCreate}
          disabled={isPending}
        >
          <span className="flex size-6 items-center justify-center rounded-md border bg-transparent">
            <Plus className="size-4" />
          </span>
          <span className="font-medium text-muted-foreground">
            Add organization
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
