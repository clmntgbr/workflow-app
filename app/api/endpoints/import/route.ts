import { requireAuth } from "@/lib/require-auth"
import { proxyBackendError } from "@/lib/proxy-backend-error"
import { NextResponse } from "next/server"

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL

export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    if ("error" in auth) return auth.error

    const incoming = await request.formData()
    const file = incoming.get("file")
    const payload = incoming.get("payload")

    if (!(file instanceof File) || typeof payload !== "string") {
      return NextResponse.json(
        { success: false, data: { message: "file and payload are required" } },
        { status: 400 }
      )
    }

    const formData = new FormData()
    formData.append("file", file, file.name)
    formData.append("payload", payload)

    const response = await fetch(`${BACKEND_API_URL}/api/endpoints/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      return proxyBackendError(response)
    }

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
