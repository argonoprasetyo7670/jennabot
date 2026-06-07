import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  deductCredits,
  storeVideoJobMeta,
  storeVideoJobResult,
  getVideoJobResult,
} from "@/lib/credits"

const USEAPI_BASE = "https://api.useapi.net/v1/google-flow"
const CAPTCHA_BROKER_URL = process.env.CAPTCHA_BROKER_URL || "http://localhost:4000"
const CAPTCHA_BROKER_KEY = process.env.CAPTCHA_BROKER_KEY || "sk-admin-change-me"
const MAX_CAPTCHA_RETRIES = 3

/** Credit cost per video — MUST match CREDIT_COST_VIDEO in generation-queue.tsx */
const CREDIT_COST_VIDEO = 5

/**
 * Track which jobs have already been credit-deducted (prevents double deduction on re-poll).
 * Cleaned up after 30 minutes.
 */
const deductedJobs = new Map<string, number>() // jobId → timestamp

setInterval(() => {
  const cutoff = Date.now() - 30 * 60_000
  for (const [id, ts] of deductedJobs) {
    if (ts < cutoff) deductedJobs.delete(id)
  }
}, 5 * 60_000)

/**
 * Fetch a reCAPTCHA token from the captcha broker.
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
 * Extract video URLs from UseAPI response.
 * Handles both sync format (response.media[].videoUrl) and async format (response.operations[].video.fifeUrl).
 */
function extractMedia(data: Record<string, unknown>): Record<string, unknown>[] {
  // Direct media array (sync POST response)
  if (Array.isArray(data.media)) {
    return data.media
  }

  // Nested response.media (job status response)
  const response = data.response as Record<string, unknown> | undefined
  if (response && Array.isArray(response.media)) {
    return response.media
  }

  // Async format: response.operations[] → convert to media format
  if (response && Array.isArray(response.operations)) {
    return (response.operations as Record<string, unknown>[])
      .filter((op) => {
        const status = (op.status as string || "").toUpperCase()
        // Handle: MEDIA_GENERATION_STATUS_SUCCESSFUL, VIDEO_GENERATION_STATUS_SUCCEEDED, etc.
        return status.includes("SUCCESS") || status.includes("SUCCEEDED")
      })
      .map((op) => {
        const video = op.video as Record<string, unknown> | undefined
        const opInner = op.operation as Record<string, unknown> | undefined
        const metadata = opInner?.metadata as Record<string, unknown> | undefined
        const metaVideo = metadata?.video as Record<string, unknown> | undefined

        // Build a media-like object that the client can parse
        const videoUrl = (video?.fifeUrl || video?.uri || metaVideo?.fifeUrl || metaVideo?.servingBaseUri) as string | undefined
        return {
          videoUrl,
          mediaGenerationId: (op.mediaGenerationId || metaVideo?.mediaGenerationId) as string | undefined,
          video: {
            generatedVideo: {
              seed: (video?.seed || metaVideo?.seed) as number | undefined,
              model: (video?.model || metaVideo?.model) as string | undefined,
              prompt: (video?.prompt || metaVideo?.prompt) as string | undefined,
              aspectRatio: (video?.aspectRatio || metaVideo?.aspectRatio) as string | undefined,
            },
          },
        }
      })
      .filter((m) => m.videoUrl)
  }

  return []
}

/**
 * POST /api/ai/video-generate
 * Sends video generation to UseAPI with async:true.
 * Returns UseAPI's jobId immediately — client polls GET for results.
 * 
 * For backward compatibility: if client doesn't send async:true,
 * falls back to sync blocking mode.
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
    const body = await req.json()
    const {
      prompt, model, aspectRatio, duration, count, seed,
      startImage, endImage, referenceImages, voice, email,
      feature,
    } = body

    const useAsync = body.async === true

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 })
    }

    // Check credit balance
    const videoCount = count || 1
    const modelToUse = model || "veo-3.1-lite-low-priority"
    const costPerVideo = modelToUse === "omni-flash" ? 100 : CREDIT_COST_VIDEO
    const requiredCredits = videoCount * costPerVideo
    const credits = await prisma.user_credits.findUnique({ where: { userId: session.user.id } })
    const currentBalance = credits?.balance ?? 0

    if (currentBalance < requiredCredits) {
      return NextResponse.json(
        { error: `Kredit tidak cukup. Butuh ${requiredCredits}, saldo: ${currentBalance}` },
        { status: 402 }
      )
    }

    // Build payload
    const basePayload: Record<string, unknown> = {
      prompt,
      model: model || "veo-3.1-lite-low-priority",
      aspectRatio: aspectRatio || "landscape",
      duration: duration || 8,
      count: videoCount,
    }

    if (useAsync) basePayload.async = true
    if (seed !== undefined && seed !== null) basePayload.seed = seed
    if (email) basePayload.email = email
    if (startImage) basePayload.startImage = startImage
    if (endImage) basePayload.endImage = endImage
    if (voice) basePayload.voice = voice

    // Attach replyUrl when running in production (not localhost)
    const appUrl = process.env.NEXTAUTH_URL || ""
    const isProduction = !appUrl.includes("localhost") && !appUrl.includes("127.0.0.1")
    if (useAsync && isProduction) {
      const secret = (process.env.NEXTAUTH_SECRET || "").slice(0, 16)
      basePayload.replyUrl = `${appUrl.replace(/\/$/, "")}/api/ai/video-callback?secret=${encodeURIComponent(secret)}`
      basePayload.replyRef = `jenna-${Date.now()}`
      console.log(`[video-generate] replyUrl set: ${basePayload.replyUrl}`)
    }

    if (referenceImages && Array.isArray(referenceImages)) {
      referenceImages.forEach((ref: string, i: number) => {
        basePayload[`referenceImage_${i + 1}`] = ref
      })
    }

    const mode = startImage ? "I2V" : referenceImages?.length ? "R2V" : "T2V"
    const feat = feature || "video-generator"

    // Try with captcha, retry on 403
    for (let attempt = 1; attempt <= MAX_CAPTCHA_RETRIES; attempt++) {
      const captchaToken = await getCaptchaToken()
      const payload = { ...basePayload }
      if (captchaToken) payload.captchaToken = captchaToken

      console.log(`[video-generate] Attempt ${attempt}/${MAX_CAPTCHA_RETRIES} mode=${mode} async=${useAsync} model=${payload.model} (captcha: ${captchaToken ? "yes" : "no"})`)

      const response = await fetch(`${USEAPI_BASE}/videos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      // 403 = captcha rejected → retry
      if (response.status === 403 && attempt < MAX_CAPTCHA_RETRIES) {
        console.warn(`[video-generate] 403 captcha rejected, retrying...`)
        continue
      }

      // 403 on last attempt → try without captcha
      if (response.status === 403 && attempt === MAX_CAPTCHA_RETRIES) {
        console.warn(`[video-generate] All captcha failed, trying without token...`)
        const fallbackRes = await fetch(`${USEAPI_BASE}/videos`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(basePayload),
        })
        const fallbackData = await fallbackRes.json()

        if (!fallbackRes.ok) {
          return NextResponse.json({ error: fallbackData.error || `API error: ${fallbackRes.status}` }, { status: fallbackRes.status })
        }

        return handlePostResponse(fallbackData, useAsync, session.user.id, videoCount, feat)
      }

      if (!response.ok) {
        console.error(`[video-generate] API error ${response.status}:`, JSON.stringify(data))
        return NextResponse.json({ error: data.error || `API error: ${response.status}` }, { status: response.status })
      }

      return handlePostResponse(data, useAsync, session.user.id, videoCount, feat)
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  } catch (error) {
    console.error("Video generation error:", error)
    return NextResponse.json({ error: "Failed to start video generation" }, { status: 500 })
  }
}

/**
 * Handle UseAPI POST response for both sync and async modes.
 */
async function handlePostResponse(
  data: Record<string, unknown>,
  useAsync: boolean,
  userId: string,
  videoCount: number,
  feature: string
) {
  const useapiJobId = (data.jobid || data.jobId) as string | undefined

  if (useAsync) {
    // Async mode: store job metadata so the callback/GET can deduct credits
    if (useapiJobId) {
      await storeVideoJobMeta(useapiJobId, { userId, videoCount, feature })
    }
    console.log(`[video-generate] Async job started: ${useapiJobId}`)
    return NextResponse.json({ jobId: useapiJobId, status: "processing" })
  } else {
    // Sync mode: UseAPI returned the full result. Deduct credits and return.
    const media = extractMedia(data)
    console.log(`[video-generate] Sync job done: ${useapiJobId}, videos=${media.length}`)
    const costPerVideo = feature === "omni-flash" ? 100 : CREDIT_COST_VIDEO
    const deducted = await deductCredits(userId, videoCount * costPerVideo, feature)
    return NextResponse.json({ jobId: useapiJobId || "", status: "done", media, creditsDeducted: deducted })
  }
}

/**
 * GET /api/ai/video-generate?jobId=xxx
 * Polls UseAPI's job status endpoint.
 * When job is completed, deducts credits and returns media.
 */
export async function GET(req: NextRequest) {
  const useapiJobId = req.nextUrl.searchParams.get("jobId")

  if (!useapiJobId) {
    return NextResponse.json({ error: "jobId parameter is required" }, { status: 400 })
  }

  const apiToken = process.env.USEAPI_TOKEN
  if (!apiToken) {
    return NextResponse.json({ error: "USEAPI_TOKEN not configured" }, { status: 500 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ── Fast path: check DB cache (populated by replyUrl webhook) ──
  const cached = await getVideoJobResult(useapiJobId)
  if (cached) {
    console.log(`[video-generate] Cache hit for job ${useapiJobId} (webhook delivered)`)
    if (cached.status === "error") {
      return NextResponse.json(
        { jobId: useapiJobId, status: "error", error: cached.error || "Generation failed" },
        { status: 500 }
      )
    }
    return NextResponse.json({
      jobId: useapiJobId,
      status: "done",
      media: cached.media,
      creditsDeducted: cached.creditsDeducted,
    })
  }

  // ── Fallback: poll UseAPI directly ──
  try {
    const res = await fetch(`${USEAPI_BASE}/jobs/${useapiJobId}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.error(`[video-generate] Poll error ${res.status} for ${useapiJobId}:`, errData)
      if (res.status === 404) {
        return NextResponse.json({ jobId: useapiJobId, status: "processing" })
      }
      return NextResponse.json(
        { jobId: useapiJobId, status: "error", error: (errData as Record<string, string>).error || `Poll failed: ${res.status}` },
        { status: 500 }
      )
    }

    const data = await res.json() as Record<string, unknown>
    const useapiStatus = data.status as string

    if (useapiStatus === "created" || useapiStatus === "started") {
      return NextResponse.json({ jobId: useapiJobId, status: "processing" })
    }

    if (useapiStatus === "failed") {
      return NextResponse.json(
        { jobId: useapiJobId, status: "error", error: (data.error as string) || "Video generation failed" },
        { status: 500 }
      )
    }

    if (useapiStatus === "completed") {
      const media = extractMedia(data)

      // Deduct credits (only once per job)
      let creditsDeducted = 0
      const deductKey = `deducted:${useapiJobId}`
      if (!deductedJobs.has(deductKey)) {
        const videoCount = media.length || 1
        const feat = (data.request as Record<string, unknown>)?.model as string || "video-generator"
        const costPerVideo = feat === "omni-flash" ? 100 : CREDIT_COST_VIDEO
        creditsDeducted = await deductCredits(session.user.id, videoCount * costPerVideo, `video-${feat}`)
        deductedJobs.set(deductKey, Date.now())
      }

      // Also cache to DB (so subsequent polls are instant even if webhook didn't arrive)
      await storeVideoJobResult(useapiJobId, {
        media,
        creditsDeducted,
        timestamp: Date.now(),
        status: "done",
      })

      console.log(`[video-generate] Job ${useapiJobId} completed via polling. videos=${media.length}`)

      return NextResponse.json({ jobId: useapiJobId, status: "done", media, creditsDeducted })
    }

    return NextResponse.json({ jobId: useapiJobId, status: "processing" })
  } catch (error) {
    console.error(`[video-generate] Poll error for ${useapiJobId}:`, error)
    return NextResponse.json(
      { jobId: useapiJobId, status: "error", error: "Failed to check job status" },
      { status: 500 }
    )
  }
}

export const maxDuration = 300
