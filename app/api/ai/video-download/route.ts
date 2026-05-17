import { NextRequest, NextResponse } from "next/server"

/**
 * Proxy download for generated videos.
 * Safari/iOS doesn't support `<a download>` for cross-origin URLs,
 * so we fetch the video server-side and return it as a blob with
 * Content-Disposition: attachment header.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  const filename = req.nextUrl.searchParams.get("filename") || "generated-video.mp4"

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

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
