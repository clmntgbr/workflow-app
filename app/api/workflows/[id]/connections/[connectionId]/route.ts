import { createAuthHeaders } from "@/lib/create-auth-headers"
import { requireAuth } from "@/lib/require-auth"
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
      return NextResponse.json({ success: false, data: await response.json() }, { status: response.status })
    }

    return new NextResponse(null, { status: response.status })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
