"use client"

import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

export function SidebarEdgeHandle() {
  const { open, toggleSidebar } = useSidebar()

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label="Open sidebar"
      tabIndex={open ? -1 : 0}
      aria-hidden={open}
      className={cn(
        "absolute left-0 top-0 z-50 flex h-full w-3 items-center justify-center overflow-hidden cursor-pointer",
        "border-r-2 border-border shadow-[1px_0_8px_rgba(0,0,0,0.06)]",
        "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "hover:w-6 hover:bg-white bg-white  group",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        open
          ? "pointer-events-none w-0 -translate-x-full opacity-0"
          : "translate-x-0 opacity-100"
      )}
    >
    </button>
  )
}
