import type { Paginate } from "@/lib/paginate"
import type { Invoice, InvoiceQuery } from "./types"

const DEFAULT_QUERY: Required<InvoiceQuery> = {
  page: 1,
  limit: 20,
}

export async function getInvoices(
  query: InvoiceQuery = {}
): Promise<Paginate<Invoice>> {
  const params = new URLSearchParams({
    page: String(query.page ?? DEFAULT_QUERY.page),
    limit: String(query.limit ?? DEFAULT_QUERY.limit),
  })

  const response = await fetch(`/api/invoices?${params}`, {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch invoices")
  }

  return response.json()
}
