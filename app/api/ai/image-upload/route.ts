import { NextRequest, NextResponse } from "next/server"

const USEAPI_BASE = "https://api.useapi.net/v1/google-flow"

/**
 * Upload assets to Google Flow.
 * Supports optional `email` query param to force upload to a specific account.
 * Also supports `url` query param to re-upload from a URL (for gallery items).
 */
export async function POST(req: NextRequest) {
  const token = process.env.USEAPI_TOKEN
  if (!token) {
    return NextResponse.json({ error: "USEAPI_TOKEN not configured" }, { status: 500 })
  }

  try {
    const email = req.nextUrl.searchParams.get("email")
    const sourceUrl = req.nextUrl.searchParams.get("url")

    let buffer: ArrayBuffer
    let fileType: string

    if (sourceUrl) {
      // Re-upload from URL (for gallery items)
      const fetchRes = await fetch(sourceUrl)
      if (!fetchRes.ok) {
        return NextResponse.json({ error: "Failed to fetch source image" }, { status: 502 })
      }
      buffer = await fetchRes.arrayBuffer()
      fileType = fetchRes.headers.get("content-type")?.split(";")[0].trim() || "image/png"
    } else {
      // Direct binary upload from client
      const contentType = req.headers.get("content-type") || ""
      fileType = contentType.split(";")[0].trim()

      const allowedTypes = ["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm", "video/quicktime"]
      if (!allowedTypes.includes(fileType)) {
        return NextResponse.json(
          { error: `Unsupported type: ${fileType}. Use PNG, JPEG, or WebP.` },
          { status: 400 }
        )
      }

      buffer = await req.arrayBuffer()
    }

    // Max 4.5MB
    if (buffer.byteLength > 4.5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 4.5MB limit" }, { status: 400 })
    }

    // Build URL: /assets or /assets/:email
    const uploadUrl = email
      ? `${USEAPI_BASE}/assets/${encodeURIComponent(email)}`
      : `${USEAPI_BASE}/assets`

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": fileType,
      },
      body: buffer,
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || `API error: ${response.status}` },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Asset upload error:", error)
    return NextResponse.json({ error: "Failed to upload asset" }, { status: 500 })
  }
}

export const maxDuration = 30
