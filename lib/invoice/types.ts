import type { Paginate, PaginateQuery } from "@/lib/paginate"

export interface Invoice {
  id: string
  subscriptionId: string | null
  stripeInvoiceId: string
  number: string
  status: string
  currency: string
  amountDue: number
  amountPaid: number
  total: number
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
  billingReason: string | null
  description: string | null
  attemptCount: number
  periodStart: string
  periodEnd: string
  paidAt: string | null
  stripeCreatedAt: string
  createdAt: string
  updatedAt: string
}

export type InvoiceQuery = Pick<PaginateQuery, "page" | "limit">
