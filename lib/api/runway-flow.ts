/**
 * Runway Video Generation API client
 * Uses UseAPI Runway endpoint (different from Google Flow)
 * Reusable across Seedance 2.0 and Motion Control pages
 */

/* ─── Types ─── */

export type RunwayVideoModel = "seedance-2" | "kling-3.0-motion-control"

export interface RunwayUploadResult {
  assetId: string
  url: string
  mediaType: string
}

export interface RunwayVideoParams {
  model: RunwayVideoModel
  text_prompt?: string
  duration?: number
  aspect_ratio?: string
  resolution?: string
  audio?: boolean
  email?: string
  /** Image reference asset IDs (up to 11 for seedance-2) */
  imageAssetIds?: string[]
  /** Video reference asset ID (required for motion-control) */
  videoAssetId?: string
  videoAssetId2?: string
  videoAssetId3?: string
  /** Keyframe asset IDs (seedance-2) */
  startFrameAssetId?: string
  endFrameAssetId?: string
  /** Motion Control specific */
  characterOrientation?: "image" | "video"
  feature?: string
  /** If true, returns immediately without polling. Webhook handles the result. */
  asyncMode?: boolean
}

export interface RunwayGeneratedVideo {
  url: string
  assetId: string
  previewUrls?: string[]
  metadata?: Record<string, unknown>
}

export interface RunwayGenerateResult {
  taskId: string
  videos: RunwayGeneratedVideo[]
  creditsDeducted?: number
}

/* ─── Upload Asset ─── */

/**
 * Upload an image or video file to Runway via our API proxy.
 */
export async function uploadRunwayAsset(
  file: File,
  email?: string
): Promise<RunwayUploadResult> {
  const allowedTypes = [
    "image/png", "image/jpeg", "image/webp", "image/gif",
    "video/mp4", "video/quicktime", "video/webm",
  ]
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Tipe file tidak didukung: ${file.type}. Gunakan PNG, JPEG, WebP, GIF, MP4, MOV, atau WebM.`)
  }
  if (file.size > 100 * 1024 * 1024) {
    throw new Error("Ukuran file melebihi batas 100MB")
  }

  const params = new URLSearchParams()
  params.set("name", file.name || `asset-${Date.now()}`)
  if (email) params.set("email", email)

  const res = await fetch(`/api/runway/asset-upload?${params}`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : data.error?.message || `Upload failed (${res.status})`
    )
  }

  return {
    assetId: data.assetId,
    url: data.url,
    mediaType: data.mediaType,
  }
}

/* ─── Generate Video ─── */

/**
 * Generate a video using Runway's unified /videos/create endpoint.
 * Uses non-blocking POST → poll GET pattern.
 */
export async function generateRunwayVideo(
  params: RunwayVideoParams
): Promise<RunwayGenerateResult> {
  // Step 1: Start generation
  const startRes = await fetch("/api/runway/video-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  const startData = await startRes.json()
  if (!startRes.ok) {
    throw new Error(
      typeof startData.error === "string"
        ? startData.error
        : startData.error?.message || `Generation failed (${startRes.status})`
    )
  }

  const taskId = startData.taskId
  if (!taskId) {
    throw new Error("No taskId returned from server")
  }

  console.log(`[runway] Task started: ${taskId}`)

  // If asyncMode is requested, return immediately without polling
  if (params.asyncMode) {
    return { taskId, videos: [] }
  }

  // Step 2: Poll for results every 5 seconds (max 10 minutes for Runway)
  const POLL_INTERVAL = 5000
  const MAX_POLLS = 120 // 10 min max (Runway can be slower than Google Flow)

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL))

    try {
      const pollRes = await fetch(
        `/api/runway/video-generate?taskId=${taskId}`
      )
      const pollData = await pollRes.json()

      if (pollData.status === "processing") {
        const progress = pollData.progressRatio
          ? `${Math.round(pollData.progressRatio * 100)}%`
          : `${(i + 1) * 5}s`
        console.log(`[runway] Task ${taskId}: processing... (${progress})`)
        continue
      }

      if (pollData.status === "error") {
        throw new Error(pollData.error || "Runway generation failed")
      }

      if (pollData.status === "done") {
        console.log(`[runway] Task ${taskId}: done!`)

        const videos: RunwayGeneratedVideo[] = (pollData.artifacts || []).map(
          (a: Record<string, unknown>) => ({
            url: a.url as string,
            assetId: a.assetId as string,
            previewUrls: a.previewUrls as string[] | undefined,
            metadata: a.metadata as Record<string, unknown> | undefined,
          })
        )

        if (videos.length === 0) {
          throw new Error("Tidak ada video yang dihasilkan. Coba prompt yang berbeda.")
        }

        return {
          taskId: pollData.taskId || taskId,
          videos,
          creditsDeducted: pollData.creditsDeducted,
        }
      }
    } catch (err) {
      // Network error during poll — keep trying
      if (i < MAX_POLLS - 1) {
        console.warn(`[runway] Poll error (will retry):`, err)
        continue
      }
      throw err
    }
  }

  throw new Error("Video generation timed out setelah 10 menit")
}
