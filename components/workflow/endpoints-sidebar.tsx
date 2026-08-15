"use client"

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { EndpointDragPayload } from "@/components/workflow/workflow-canvas"
import { listEndpoints } from "@/lib/endpoint/api"
import { Endpoint, EndpointMethod } from "@/lib/endpoint/types"
import { cn } from "@/lib/utils"
import { SearchIcon, XIcon } from "lucide-react"
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

type EndpointsSidebarProps = {
  onSelectEndpoint: (endpoint: Endpoint) => void
}

export function EndpointsSidebar({ onSelectEndpoint }: EndpointsSidebarProps) {
  const { open, setOpen } = useSidebar()
  const requestIdRef = useRef(0)

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedMethods, setSelectedMethods] = useState<EndpointMethod[]>([])
  const [members, setMembers] = useState<Endpoint[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const requestId = ++requestIdRef.current
    setIsLoading(true)

    const load = async () => {
      try {
        const result = await listEndpoints({
          page: 1,
          limit: PAGE_LIMIT,
          search: debouncedSearch || undefined,
          method:
            selectedMethods.length > 0 ? selectedMethods : undefined,
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
  }, [open, debouncedSearch, selectedMethods])

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
    <aside
      aria-hidden={!open}
      className={cn(
        "absolute inset-y-0 left-0 z-40 flex w-[25rem] flex-col",
        "border-r bg-sidebar text-sidebar-foreground",
        "shadow-[4px_0_24px_rgba(0,0,0,0.08)]",
        "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        open ? "translate-x-0" : "pointer-events-none -translate-x-full"
      )}
    >
      <SidebarHeader className="gap-3 border-b px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <h2 className="text-sm font-semibold tracking-tight">Endpoints</h2>
            <p className="text-xs text-muted-foreground">
              Drag onto the canvas to add a step.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
            tabIndex={open ? 0 : -1}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or URL…"
            tabIndex={open ? 0 : -1}
            className="pl-8"
            aria-label="Search endpoints"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTER_METHODS.map((method) => {
            const isSelected = selectedMethods.includes(method)
            return (
              <button
                key={method}
                type="button"
                tabIndex={open ? 0 : -1}
                aria-pressed={isSelected}
                onClick={() => toggleMethod(method)}
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                  isSelected
                    ? METHOD_STYLES[method]
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {method}
              </button>
            )
          })}
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
              <SidebarMenu>
                {members.map((endpoint) => {
                  const method = (endpoint.method || "GET").toUpperCase()
                  const methodClass =
                    METHOD_STYLES[method] ?? "bg-muted text-muted-foreground"

                  return (
                    <SidebarMenuItem key={endpoint.id}>
                      <SidebarMenuButton asChild>
                        <div
                          role="button"
                          tabIndex={open ? 0 : -1}
                          className="flex cursor-grab items-center gap-3 active:cursor-grabbing"
                          draggable={open}
                          onClick={() => onSelectEndpoint(endpoint)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              onSelectEndpoint(endpoint)
                            }
                          }}
                          onDragStart={(event) =>
                            handleDragStart(event, endpoint)
                          }
                        >
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              methodClass
                            )}
                          >
                            {method}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {endpoint.name}
                          </span>
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
    </aside>
  )
}
