import { createAuthHeaders } from "@/lib/create-auth-headers"
import { requireAuth } from "@/lib/require-auth"
import { proxyBackendError } from "@/lib/proxy-backend-error"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

type RouteContext = {
  params: Promise<{ id: string; stepId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const { id, stepId } = await context.params
    const query = request.nextUrl.searchParams.toString()
    const url = query
      ? `${BACKEND_API_URL}/api/workflows/${id}/steps/${stepId}/variable-paths?${query}`
      : `${BACKEND_API_URL}/api/workflows/${id}/steps/${stepId}/variable-paths`

    const response = await fetch(url, {
      method: "GET",
      headers: createAuthHeaders(auth.token),
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
