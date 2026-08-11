import { createAuthHeaders } from "@/lib/create-auth-headers"
import { requireAuth } from "@/lib/require-auth"
import { NextResponse } from "next/server"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const { id } = await context.params
    const body = await request.text()
    const response = await fetch(
      `${BACKEND_API_URL}/api/organizations/${id}/members`,
      {
        method: "POST",
        headers: createAuthHeaders(auth.token),
        body,
      }
    )

    if (!response.ok) {
      return NextResponse.json({ success: false }, { status: response.status })
    }

    return new NextResponse(null, { status: response.status })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
