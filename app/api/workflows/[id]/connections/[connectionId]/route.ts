import { createAuthHeaders } from "@/lib/create-auth-headers"
import { requireAuth } from "@/lib/require-auth"
import { proxyBackendError } from "@/lib/proxy-backend-error"
import { NextResponse } from "next/server"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

type RouteContext = {
  params: Promise<{ id: string; connectionId: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const { id, connectionId } = await context.params
    const response = await fetch(
      `${BACKEND_API_URL}/api/workflows/${id}/connections/${connectionId}`,
      {
        method: "DELETE",
        headers: createAuthHeaders(auth.token),
      }
    )

    if (!response.ok) {
      return proxyBackendError(response)
    }

    return new NextResponse(null, { status: response.status })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
