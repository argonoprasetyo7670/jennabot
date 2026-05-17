import { NextRequest, NextResponse } from "next/server"

/**
 * Proxy download/playback for generated videos.
 * Safari/iOS doesn't support `<a download>` for cross-origin URLs,
 * so we fetch the video server-side and return it as a blob.
 * 
 * Query params:
 *   url      - Video URL to proxy (required)
 *   filename - Download filename (default: generated-video.mp4)
 *   mode     - "inline" for playback, "attachment" for download (default: inline)
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  const filename = req.nextUrl.searchParams.get("filename") || "generated-video.mp4"
  const mode = req.nextUrl.searchParams.get("mode") || "inline"

  if (!url) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 })
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch video" }, { status: 502 })
    }

    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get("content-type") || "video/mp4"

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
      "Accept-Ranges": "bytes",
    }

    if (mode === "attachment") {
      headers["Content-Disposition"] = `attachment; filename="${filename}"`
    } else {
      headers["Content-Disposition"] = "inline"
    }

    return new NextResponse(buffer, { status: 200, headers })
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
