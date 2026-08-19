"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import EndpointPreview from "@/components/workflow/endpoint-preview"
import { EndpointDragPayload } from "@/components/workflow/workflow-canvas"
import { listEndpoints } from "@/lib/endpoint/api"
import { subscribeEndpointsRefetch } from "@/lib/endpoint/endpoint-realtime"
import { Endpoint, EndpointMethod } from "@/lib/endpoint/types"
import { cn } from "@/lib/utils"
import { SearchIcon } from "lucide-react"
import { useEffect, useRef, useState, type DragEvent } from "react"

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-700",
  POST: "bg-blue-50 text-blue-700",
  PUT: "bg-amber-50 text-amber-700",
  PATCH: "bg-orange-50 text-orange-700",
  DELETE: "bg-red-50 text-red-700",
  HEAD: "bg-slate-50 text-slate-700",
  OPTIONS: "bg-violet-50 text-violet-700",
}

const FILTER_METHODS: EndpointMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]

const PAGE_LIMIT = 50
const SEARCH_DEBOUNCE_MS = 300

interface EndpointsSidebarProps {
  onSelectEndpoint?: (endpoint: Endpoint) => void
}

export function EndpointsSidebar({ onSelectEndpoint }: EndpointsSidebarProps) {
  const requestIdRef = useRef(0)

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedMethods, setSelectedMethods] = useState<EndpointMethod[]>([])
  const [members, setMembers] = useState<Endpoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    return subscribeEndpointsRefetch(() => {
      setRefreshTick((value) => value + 1)
    })
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    let cancelled = false
    const requestId = ++requestIdRef.current
    setIsLoading(true)

    const load = async () => {
      try {
        const result = await listEndpoints({
          page: 1,
          limit: PAGE_LIMIT,
          search: debouncedSearch || undefined,
          method: selectedMethods.length > 0 ? selectedMethods : undefined,
        })
        if (cancelled || requestId !== requestIdRef.current) return
        setMembers(result.members)
      } catch {
        if (cancelled || requestId !== requestIdRef.current) return
        setMembers([])
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [debouncedSearch, selectedMethods, refreshTick])

  const toggleMethod = (method: EndpointMethod) => {
    setSelectedMethods((current) =>
      current.includes(method)
        ? current.filter((item) => item !== method)
        : [...current, method]
    )
  }

  const handleDragStart = (event: DragEvent, endpoint: Endpoint) => {
    const payload: EndpointDragPayload = {
      id: endpoint.id,
      name: endpoint.name,
      method: endpoint.method,
      path: endpoint.url,
      description: endpoint.description,
    }
    event.dataTransfer.setData(
      "application/workflow-endpoint",
      JSON.stringify(payload)
    )
    event.dataTransfer.effectAllowed = "copy"
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="gap-3 border-b px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-sm font-semibold tracking-tight">Endpoints</h2>
          <p className="text-xs text-muted-foreground">
            Drag onto the canvas to add a step.
          </p>
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or URL…"
            className="pl-8"
            aria-label="Search endpoints"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {isLoading && members.length === 0 ? (
              <div className="space-y-2 px-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : members.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">
                No endpoints found.
              </p>
            ) : (
              <SidebarMenu className="space-y-2 pt-2">
                {members.map((endpoint) => {
                  return (
                    <SidebarMenuItem key={endpoint.id}>
                      <SidebarMenuButton
                        asChild
                        className="h-auto p-0 hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent"
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          className={cn(
                            "group relative flex w-full cursor-grab items-center gap-3 rounded-lg border border-border bg-card px-4 py-2 transition-all duration-200",
                            "hover:shadow-sm active:cursor-grabbing"
                          )}
                          draggable
                          onClick={() => onSelectEndpoint?.(endpoint)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              onSelectEndpoint?.(endpoint)
                            }
                          }}
                          onDragStart={(event) =>
                            handleDragStart(event, endpoint)
                          }
                        >
                          <EndpointPreview
                            endpoint={endpoint}
                            showDescription={false}
                            className="min-w-0 flex-1"
                          />
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
