import { createAuthHeaders } from "@/lib/create-auth-headers"
import { proxyBackendError } from "@/lib/proxy-backend-error"
import { requireAuth } from "@/lib/require-auth"
import { NextResponse } from "next/server"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

export async function GET(request: Request) {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const { searchParams } = new URL(request.url)
    const query = searchParams.toString()
    const url = query
      ? `${BACKEND_API_URL}/api/invoices?${query}`
      : `${BACKEND_API_URL}/api/invoices`

    const response = await fetch(url, {
      method: "GET",
      headers: createAuthHeaders(auth.token),
      cache: "no-store",
    })

    if (!response.ok) {
      return proxyBackendError(response)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
