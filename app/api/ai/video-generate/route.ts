import { NextRequest, NextResponse } from "next/server"

const USEAPI_BASE = "https://api.useapi.net/v1/google-flow"
const CAPTCHA_BROKER_URL = process.env.CAPTCHA_BROKER_URL || "http://localhost:4000"
const CAPTCHA_BROKER_KEY = process.env.CAPTCHA_BROKER_KEY || "sk-admin-change-me"
const MAX_CAPTCHA_RETRIES = 3

/**
 * In-memory job store for async video generation.
 * Jobs survive as long as the server process is alive.
 * Cleaned up after 30 minutes.
 */
interface VideoJob {
  id: string
  status: "processing" | "done" | "error"
  data?: Record<string, unknown>
  error?: string
  createdAt: number
}

const videoJobs = new Map<string, VideoJob>()

// Cleanup old jobs every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60_000
  for (const [id, job] of videoJobs) {
    if (job.createdAt < cutoff) videoJobs.delete(id)
  }
}, 5 * 60_000)

/**
 * Fetch a reCAPTCHA token from the captcha broker (action: VIDEO_GENERATION).
 */
async function getCaptchaToken(): Promise<string | null> {
  try {
    const res = await fetch(`${CAPTCHA_BROKER_URL}/token?action=VIDEO_GENERATION`, {
      headers: { "X-API-Key": CAPTCHA_BROKER_KEY },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.warn(`Captcha broker error ${res.status}: ${err.error || res.statusText}`)
      return null
    }

    const data = await res.json()
    return data.token || null
  } catch (err) {
    console.warn("Captcha broker unavailable:", err)
    return null
  }
}

/**
 * Run the actual video generation (called in background).
 */
async function runVideoGeneration(jobId: string, basePayload: Record<string, unknown>, mode: string) {
  const token = process.env.USEAPI_TOKEN!

  try {
    for (let attempt = 1; attempt <= MAX_CAPTCHA_RETRIES; attempt++) {
      const captchaToken = await getCaptchaToken()
      const payload = { ...basePayload }
      if (captchaToken) payload.captchaToken = captchaToken

      console.log(`[video-generate] Job ${jobId} attempt ${attempt}/${MAX_CAPTCHA_RETRIES} mode=${mode} model=${payload.model} (captcha: ${captchaToken ? "yes" : "no"})`)

      const response = await fetch(`${USEAPI_BASE}/videos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      // 403 = captcha rejected → retry with fresh token
      if (response.status === 403 && attempt < MAX_CAPTCHA_RETRIES) {
        console.warn(`[video-generate] Job ${jobId}: 403 captcha rejected, retrying...`)
        continue
      }

      // 403 on last attempt → try without captcha token
      if (response.status === 403 && attempt === MAX_CAPTCHA_RETRIES) {
        console.warn(`[video-generate] Job ${jobId}: All captcha attempts failed, trying without token...`)
        const fallbackResponse = await fetch(`${USEAPI_BASE}/videos`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(basePayload),
        })
        const fallbackData = await fallbackResponse.json()

        if (!fallbackResponse.ok) {
          videoJobs.set(jobId, { id: jobId, status: "error", error: fallbackData.error || `API error: ${fallbackResponse.status}`, createdAt: Date.now() })
          return
        }

        console.log(`[video-generate] Job ${jobId}: Success (fallback)! videos=${fallbackData.media?.length || 0}`)
        videoJobs.set(jobId, { id: jobId, status: "done", data: fallbackData, createdAt: Date.now() })
        return
      }

      // Any other error
      if (!response.ok) {
        console.error(`[video-generate] Job ${jobId}: API error ${response.status}`)
        videoJobs.set(jobId, { id: jobId, status: "error", error: data.error || `API error: ${response.status}`, createdAt: Date.now() })
        return
      }

      // Success
      console.log(`[video-generate] Job ${jobId}: Success! jobId=${data.jobId}, videos=${data.media?.length || 0}`)
      videoJobs.set(jobId, { id: jobId, status: "done", data, createdAt: Date.now() })
      return
    }

    videoJobs.set(jobId, { id: jobId, status: "error", error: "All retry attempts exhausted", createdAt: Date.now() })
  } catch (error) {
    console.error(`[video-generate] Job ${jobId}: Fatal error:`, error)
    videoJobs.set(jobId, {
      id: jobId, status: "error",
      error: error instanceof Error ? error.message : "Generation failed",
      createdAt: Date.now(),
    })
  }
}

/**
 * POST /api/ai/video-generate
 * Starts video generation in background and returns jobId immediately.
 * Client should poll GET /api/ai/video-generate?jobId=xxx for results.
 */
export async function POST(req: NextRequest) {
  const token = process.env.USEAPI_TOKEN
  if (!token) {
    return NextResponse.json({ error: "USEAPI_TOKEN not configured" }, { status: 500 })
  }

  try {
    const body = await req.json()
    const {
      prompt, model, aspectRatio, duration, count, seed,
      startImage, endImage, referenceImages, voice, email,
    } = body

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 })
    }

    // Build base payload
    const basePayload: Record<string, unknown> = {
      prompt,
      model: model || "veo-3.1-fast",
      aspectRatio: aspectRatio || "landscape",
      duration: duration || 8,
      count: count || 1,
    }

    if (seed !== undefined && seed !== null) basePayload.seed = seed
    if (email) basePayload.email = email
    if (startImage) basePayload.startImage = startImage
    if (endImage) basePayload.endImage = endImage
    if (voice) basePayload.voice = voice

    if (referenceImages && Array.isArray(referenceImages)) {
      referenceImages.forEach((ref: string, i: number) => {
        basePayload[`referenceImage_${i + 1}`] = ref
      })
    }

    const mode = startImage ? "I2V" : referenceImages?.length ? "R2V" : "T2V"

    // Create job ID and start in background
    const jobId = `vj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    videoJobs.set(jobId, { id: jobId, status: "processing", createdAt: Date.now() })

    // Fire and forget — runs in background, does NOT block the response
    runVideoGeneration(jobId, basePayload, mode)

    console.log(`[video-generate] Job ${jobId} started (mode=${mode}, model=${basePayload.model})`)

    // Return immediately with jobId
    return NextResponse.json({
      jobId,
      status: "processing",
      message: "Video generation started. Poll GET /api/ai/video-generate?jobId=xxx for results.",
    })
  } catch (error) {
    console.error("Video generation error:", error)
    return NextResponse.json(
      { error: "Failed to start video generation" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/video-generate?jobId=xxx
 * Poll for video generation status.
 */
export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId")

  if (!jobId) {
    return NextResponse.json({ error: "jobId parameter is required" }, { status: 400 })
  }

  const job = videoJobs.get(jobId)
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  if (job.status === "processing") {
    return NextResponse.json({ jobId, status: "processing" })
  }

  if (job.status === "error") {
    // Clean up after returning error
    videoJobs.delete(jobId)
    return NextResponse.json({ jobId, status: "error", error: job.error }, { status: 500 })
  }

  // Done — return the full UseAPI response data
  videoJobs.delete(jobId)
  return NextResponse.json({ jobId, status: "done", ...job.data })
}

// Keep maxDuration for the POST handler context
export const maxDuration = 300
