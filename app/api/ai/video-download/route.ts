import { NextRequest, NextResponse } from "next/server"

/**
 * Proxy download/playback for generated videos.
 * Safari/iOS requires Range request support for video playback,
 * so we cache the video and support byte-range serving.
 * 
 * Query params:
 *   url      - Video URL to proxy (required)
 *   filename - Download filename (default: generated-video.mp4)
 *   mode     - "inline" for playback, "attachment" for download (default: inline)
 */

// Simple in-memory cache for video buffers (max 10, auto-evict oldest)
const videoCache = new Map<string, { buffer: ArrayBuffer; contentType: string; cachedAt: number }>()
const MAX_CACHE = 10

function evictOldest() {
  if (videoCache.size <= MAX_CACHE) return
  let oldestKey = ""
  let oldestTime = Infinity
  for (const [key, val] of videoCache) {
    if (val.cachedAt < oldestTime) {
      oldestTime = val.cachedAt
      oldestKey = key
    }
  }
  if (oldestKey) videoCache.delete(oldestKey)
}

// Cleanup cache every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 15 * 60_000
  for (const [key, val] of videoCache) {
    if (val.cachedAt < cutoff) videoCache.delete(key)
  }
}, 10 * 60_000)

async function fetchAndCache(url: string): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const cached = videoCache.get(url)
  if (cached) return cached

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.status}`)
  }

  const buffer = await response.arrayBuffer()
  const contentType = response.headers.get("content-type") || "video/mp4"

  const entry = { buffer, contentType, cachedAt: Date.now() }
  videoCache.set(url, entry)
  evictOldest()

  return entry
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  const filename = req.nextUrl.searchParams.get("filename") || "generated-video.mp4"
  const mode = req.nextUrl.searchParams.get("mode") || "inline"

  if (!url) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 })
  }

  try {
    const { buffer, contentType } = await fetchAndCache(url)
    const totalSize = buffer.byteLength

    // Check for Range header (Safari sends this for video playback)
    const rangeHeader = req.headers.get("range")

    if (rangeHeader) {
      // Parse Range: bytes=start-end
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      if (match) {
        const start = parseInt(match[1], 10)
        const end = match[2] ? parseInt(match[2], 10) : totalSize - 1
        const chunkSize = end - start + 1

        const rangeHeaders: Record<string, string> = {
            "Content-Type": contentType,
            "Content-Range": `bytes ${start}-${end}/${totalSize}`,
            "Content-Length": String(chunkSize),
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
          }

          // Safari iOS needs Content-Disposition even on Range responses
          if (mode === "attachment") {
            rangeHeaders["Content-Disposition"] = `attachment; filename="${filename}"`
          }

          return new NextResponse(buffer.slice(start, end + 1), {
          status: 206,
          headers: rangeHeaders,
        })
      }
    }

    // Full response (no Range header)
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Length": String(totalSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
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
