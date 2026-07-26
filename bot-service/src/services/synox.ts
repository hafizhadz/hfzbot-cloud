// ── SynoxCloud API Client ─────────────────────────────────────────────────────
// Base client for all SynoxCloud API calls.

const BASE = "https://api.synoxcloud.xyz"

interface SynoxResponse {
  status?: number
  result?: unknown
  data?: unknown
  creator?: string
  [key: string]: unknown
}

async function get(endpoint: string, params: Record<string, string> = {}): Promise<SynoxResponse | null> {
  const query = new URLSearchParams(params).toString()
  const url = `${BASE}${endpoint}${query ? "?" + query : ""}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("image") || contentType.includes("audio") || contentType.includes("video")) {
      return { result: url }
    }
    return await res.json() as SynoxResponse
  } catch {
    return null
  }
}

async function getText(endpoint: string, params: Record<string, string> = {}): Promise<string | null> {
  const query = new URLSearchParams(params).toString()
  const url = `${BASE}${endpoint}${query ? "?" + query : ""}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function extract(data: SynoxResponse | string | null): string {
  if (!data) return "Error: API tidak merespon."
  if (typeof data === "string") return data
  // Try common response patterns
  const result = data.result ?? data.data ?? data
  if (typeof result === "string") return result
  if (typeof result === "object" && result !== null) {
    // Try to find a text field
    const text = (result as Record<string, unknown>).respon ?? 
                 (result as Record<string, unknown>).response ??
                 (result as Record<string, unknown>).message ??
                 (result as Record<string, unknown>).text ??
                 (result as Record<string, unknown>).hasil ??
                 (result as Record<string, unknown>).result
    if (typeof text === "string") return text
    return JSON.stringify(result, null, 2)
  }
  return String(result ?? JSON.stringify(data))
}

export const synox = {
  get,
  getText,
  extract,
}
