export const OPENAPI_MAX_FILE_BYTES = 8 * 1024 * 1024

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function isOpenApi3Document(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (typeof value.openapi !== "string" || !value.openapi.startsWith("3")) {
    return false
  }
  if (!isRecord(value.info)) return false
  if (
    typeof value.info.title !== "string" ||
    typeof value.info.version !== "string"
  ) {
    return false
  }
  return isRecord(value.paths)
}

export function getOpenApiServerBaseUrl(value: unknown): string {
  if (
    !isRecord(value) ||
    !Array.isArray(value.servers) ||
    value.servers.length === 0
  ) {
    return ""
  }

  const first = value.servers[0]
  if (!isRecord(first) || typeof first.url !== "string") return ""

  const url = first.url.trim()
  if (!url || url === "/" || url.startsWith("/") || url.includes("{")) {
    return ""
  }

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return ""
    return url.replace(/\/+$/, "")
  } catch {
    return ""
  }
}

export async function parseOpenApiFile(file: File): Promise<{
  valid: boolean
  baseURL: string
}> {
  if (file.size > OPENAPI_MAX_FILE_BYTES) {
    return { valid: false, baseURL: "" }
  }

  try {
    const json: unknown = JSON.parse(await file.text())
    if (!isOpenApi3Document(json)) {
      return { valid: false, baseURL: "" }
    }
    return { valid: true, baseURL: getOpenApiServerBaseUrl(json) }
  } catch {
    return { valid: false, baseURL: "" }
  }
}
