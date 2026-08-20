"use client"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import { ChevronsLeft, ChevronsRight } from "lucide-react"

interface ListPaginationProps {
  page: number
  totalPages: number
  isLoading?: boolean
  ariaLabel?: string
  className?: string
  onPageChange: (page: number) => void
}

function getPageItems(
  currentPage: number,
  totalPages: number
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const items: Array<number | "ellipsis"> = [1]

  if (currentPage > 3) {
    items.push("ellipsis")
  }

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  for (let page = start; page <= end; page += 1) {
    items.push(page)
  }

  if (currentPage < totalPages - 2) {
    items.push("ellipsis")
  }

  items.push(totalPages)
  return items
}

function paginationLinkProps(
  isLoading: boolean,
  isDisabled: boolean,
  onNavigate: () => void
) {
  return {
    href: "#",
    "aria-disabled": isDisabled || isLoading,
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
      if (isDisabled || isLoading) return
      onNavigate()
    },
  }
}

export function ListPagination({
  page,
  totalPages,
  isLoading = false,
  ariaLabel = "Pagination",
  className,
  onPageChange,
}: ListPaginationProps) {
  const pageItems = getPageItems(page, totalPages)

  return (
    <Pagination className={cn("pt-4", className)} aria-label={ariaLabel}>
      <PaginationContent>
        <PaginationItem
          className={cn(
            (page <= 1 || isLoading) &&
              "pointer-events-none bg-white opacity-50"
          )}
        >
          <PaginationLink
            aria-label="Go to first page"
            size="default"
            className="bg-white ps-2!"
            {...paginationLinkProps(isLoading, page <= 1, () =>
              onPageChange(1)
            )}
          >
            <ChevronsLeft data-icon="inline-start" className="rtl:rotate-180" />
            <span className="sr-only">First</span>
          </PaginationLink>
        </PaginationItem>

        <PaginationItem
          className={cn(
            (page <= 1 || isLoading) &&
              "pointer-events-none bg-white opacity-50"
          )}
        >
          <PaginationPrevious
            className="bg-white"
            size="default"
            {...paginationLinkProps(isLoading, page <= 1, () =>
              onPageChange(page - 1)
            )}
          />
        </PaginationItem>

        {pageItems.map((item, index) =>
          item === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                className="bg-white"
                size="default"
                isActive={item === page}
                {...paginationLinkProps(isLoading, item === page, () =>
                  onPageChange(item)
                )}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem
          className={cn(
            (page >= totalPages || isLoading) &&
              "pointer-events-none bg-white opacity-50"
          )}
        >
          <PaginationNext
            className="bg-white"
            size="default"
            {...paginationLinkProps(isLoading, page >= totalPages, () =>
              onPageChange(page + 1)
            )}
          />
        </PaginationItem>

        <PaginationItem
          className={cn(
            (page >= totalPages || isLoading) &&
              "pointer-events-none bg-white opacity-50"
          )}
        >
          <PaginationLink
            aria-label="Go to last page"
            size="default"
            className="pe-2!"
            {...paginationLinkProps(isLoading, page >= totalPages, () =>
              onPageChange(totalPages)
            )}
          >
            <span className="sr-only">Last</span>
            <ChevronsRight data-icon="inline-end" className="rtl:rotate-180" />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
