import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

const USEAPI_BASE = "https://api.useapi.net/v1/runwayml"

/**
 * POST /api/runway/asset-upload
 * Upload an image or video asset to Runway via UseAPI.
 *
 * Query params:
 *   name  - Asset name (required)
 *   email - Runway account email (optional, for multi-account)
 *
 * Request body: raw binary data
 * Content-Type: image/png, image/jpeg, image/webp, video/mp4, etc.
 *
 * Returns: { assetId, url, mediaType }
 */
export async function POST(req: NextRequest) {
  const apiToken = process.env.USEAPI_TOKEN
  if (!apiToken) {
    return NextResponse.json({ error: "USEAPI_TOKEN not configured" }, { status: 500 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const contentType = req.headers.get("content-type") || "image/jpeg"
    const name = req.nextUrl.searchParams.get("name") || `asset-${Date.now()}`
    const email = req.nextUrl.searchParams.get("email")

    // Build UseAPI URL with query params
    const params = new URLSearchParams()
    params.set("name", name)
    if (email) params.set("email", email)

    const body = await req.arrayBuffer()

    console.log(`[runway/asset-upload] Uploading ${contentType} asset "${name}" (${body.byteLength} bytes)`)

    const response = await fetch(`${USEAPI_BASE}/assets/?${params}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": contentType,
      },
      body,
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(`[runway/asset-upload] Error ${response.status}:`, data)
      return NextResponse.json(
        { error: data.error || `Upload failed (${response.status})` },
        { status: response.status }
      )
    }

    console.log(`[runway/asset-upload] Success: assetId=${data.assetId}`)

    return NextResponse.json({
      assetId: data.assetId,
      url: data.url,
      mediaType: data.type?.type || "image",
      name: data.name,
    })
  } catch (error) {
    console.error("[runway/asset-upload] Error:", error)
    return NextResponse.json({ error: "Asset upload failed" }, { status: 500 })
  }
}

export const maxDuration = 120
