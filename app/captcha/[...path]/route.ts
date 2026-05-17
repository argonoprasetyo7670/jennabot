import { NextRequest, NextResponse } from "next/server"

const CAPTCHA_BROKER_URL = process.env.CAPTCHA_BROKER_URL || "http://localhost:4000"

/**
 * Proxy all /captcha/* requests to the captcha broker server (localhost:4000).
 * Supports GET, POST, DELETE, OPTIONS methods.
 */
async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const targetPath = "/" + path.join("/")
  const url = new URL(req.url)
  const queryString = url.search // includes the "?"
  const targetUrl = `${CAPTCHA_BROKER_URL}${targetPath}${queryString}`

  try {
    // Forward headers (strip host-related ones)
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      if (!["host", "connection", "transfer-encoding"].includes(key.toLowerCase())) {
        headers[key] = value
      }
    })

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    }

    // Forward body for POST/PUT/PATCH/DELETE
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      try {
        fetchOptions.body = await req.text()
      } catch {
        // No body — that's fine
      }
    }

    const response = await fetch(targetUrl, fetchOptions)
    const body = await response.text()

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "X-API-Key, X-Worker-ID, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      },
    })
  } catch (error) {
    console.error("[captcha-proxy] Error:", error)
    return NextResponse.json(
      { success: false, error: "Captcha broker unreachable" },
      { status: 502 }
    )
  }
}

export const GET = proxyRequest
export const POST = proxyRequest
export const DELETE = proxyRequest

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "X-API-Key, X-Worker-ID, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    },
  })
}
