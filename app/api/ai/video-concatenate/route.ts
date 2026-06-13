import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

const USEAPI_BASE = "https://api.useapi.net/v1/google-flow"

export async function POST(req: NextRequest) {
  const token = process.env.USEAPI_TOKEN
  if (!token) {
    return NextResponse.json({ error: "USEAPI_TOKEN not configured" }, { status: 500 })
  }

  // Auth check using standard next-auth beta edge-compatible
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { media } = body

    if (!media || !Array.isArray(media) || media.length < 2) {
      return NextResponse.json({ error: "At least 2 media generation IDs are required" }, { status: 400 })
    }

    console.log(`[video-concatenate] Initiating concatenation for ${media.length} videos`)

    // Call UseAPI directly and stream the response
    const response = await fetch(`${USEAPI_BASE}/videos/concatenate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ media }),
    })

    if (!response.ok) {
      // Small error responses can be parsed directly
      const errData = await response.text()
      console.error(`[video-concatenate] Error ${response.status}:`, errData)
      return new Response(errData, {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      })
    }

    console.log(`[video-concatenate] Streaming response back to client (status: ${response.status})`)

    // Return the response stream directly to avoid 4.5MB Vercel limit
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        // Pass through UseAPI headers if needed
      }
    })

  } catch (error) {
    console.error("[video-concatenate] Proxy error:", error)
    return NextResponse.json(
      { error: "Internal server error during concatenation proxy" },
      { status: 500 }
    )
  }
}
