"use client"

import { EndpointDrawer } from "@/components/endpoint/endpoint-drawer"
import { EndpointImportDrawer } from "@/components/endpoint/endpoint-import-drawer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOrganization } from "@/lib/organization/context"
import { useEndpoint } from "@/lib/endpoint/context"
import { Endpoint } from "@/lib/endpoint/types"
import { PlusIcon, SettingsIcon, UploadIcon } from "lucide-react"
import { useState } from "react"

export function EndpointList() {
  const { activeOrganization } = useOrganization()
  const { endpoints, isLoading } = useEndpoint()
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(
    null
  )
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("edit")

  const selectedEndpoint =
    selectedEndpointId != null
      ? (endpoints.members.find(
          (endpoint) => endpoint.id === selectedEndpointId
        ) ?? null)
      : null

  const openCreate = () => {
    setSelectedEndpointId(null)
    setDrawerMode("create")
    setIsDrawerOpen(true)
  }

  const openEdit = (endpoint: Endpoint) => {
    setSelectedEndpointId(endpoint.id)
    setDrawerMode("edit")
    setIsDrawerOpen(true)
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedEndpointId(null)
  }

  if (!activeOrganization) {
    return null
  }

  return (
    <div className="space-y-6 border-t px-6 pt-10 pb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Endpoints</h2>
          <p className="text-sm text-muted-foreground">
            HTTP endpoints for {activeOrganization.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <UploadIcon className="size-4" />
            Import
          </Button>
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" />
            New endpoint
          </Button>
        </div>
      </div>

      {isLoading && endpoints.members.length === 0 ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : endpoints.members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No endpoints yet. Create one to get started.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {endpoints.members.map((endpoint) => (
            <li key={endpoint.id} className="flex items-stretch">
              <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase">
                      {endpoint.method}
                    </span>
                    <p className="truncate font-medium">{endpoint.name}</p>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {endpoint.url}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border px-2 py-0.5 text-xs text-muted-foreground capitalize">
                  {endpoint.status}
                </span>
              </div>
              <div className="flex items-center border-s px-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${endpoint.name}`}
                  onClick={() => openEdit(endpoint)}
                >
                  <SettingsIcon className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <EndpointDrawer
        endpoint={drawerMode === "edit" ? selectedEndpoint : null}
        isOpen={isDrawerOpen}
        onOpenChange={(open) => {
          if (!open) closeDrawer()
          else setIsDrawerOpen(true)
        }}
        onSaved={(endpoint) => {
          if (drawerMode === "edit") setSelectedEndpointId(endpoint.id)
        }}
        onDeleted={closeDrawer}
      />

      <EndpointImportDrawer
        isOpen={isImportOpen}
        onOpenChange={setIsImportOpen}
      />
    </div>
  )
}
