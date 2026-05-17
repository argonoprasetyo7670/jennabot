import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const USEAPI_BASE = "https://api.useapi.net/v1/google-flow"
const CAPTCHA_BROKER_URL = process.env.CAPTCHA_BROKER_URL || "http://localhost:4000"
const CAPTCHA_BROKER_KEY = process.env.CAPTCHA_BROKER_KEY || "sk-admin-change-me"
const MAX_CAPTCHA_RETRIES = 3

/** Credit cost per video — MUST match CREDIT_COST_VIDEO in generation-queue.tsx */
const CREDIT_COST_VIDEO = 20

/**
 * In-memory job store for async video generation.
 * Cleaned up after 30 minutes.
 */
interface VideoJob {
  id: string
  status: "processing" | "done" | "error"
  data?: Record<string, unknown>
  error?: string
  /** Stored for deduction when client picks up the result */
  userId: string
  videoCount: number
  feature: string
  creditsDeducted?: number
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
 * Deduct credits for a user. Returns amount deducted.
 */
async function deductCredits(userId: string, videoCount: number, feature: string): Promise<number> {
  const amount = videoCount * CREDIT_COST_VIDEO
  try {
    const credits = await prisma.user_credits.findUnique({ where: { userId } })
    const currentBalance = credits?.balance ?? 0
    const newBalance = Math.max(0, currentBalance - amount)

    await prisma.$transaction([
      prisma.user_credits.upsert({
        where: { userId },
        update: { balance: newBalance, updatedAt: new Date() },
        create: { id: crypto.randomUUID(), userId, balance: newBalance, updatedAt: new Date() },
      }),
      prisma.credit_transactions.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          type: "deduct",
          amount: -amount,
          balance: newBalance,
          description: `Video generation (${feature})`,
          feature,
        },
      }),
    ])

    console.log(`[video-generate] Credits deducted: ${amount} for user ${userId}. Balance: ${currentBalance} → ${newBalance}`)
    return amount
  } catch (err) {
    console.error(`[video-generate] Failed to deduct credits for user ${userId}:`, err)
    return 0
  }
}

/**
 * Run the actual video generation in background.
 * Credits are NOT deducted here — they're deducted when the client picks up the result.
 */
async function runVideoGeneration(
  jobId: string,
  basePayload: Record<string, unknown>,
  mode: string,
  userId: string,
  videoCount: number,
  feature: string
) {
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

      // 403 = captcha rejected → retry
      if (response.status === 403 && attempt < MAX_CAPTCHA_RETRIES) {
        console.warn(`[video-generate] Job ${jobId}: 403 captcha rejected, retrying...`)
        continue
      }

      // 403 on last attempt → try without captcha
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
          videoJobs.set(jobId, { id: jobId, status: "error", error: fallbackData.error || `API error: ${fallbackResponse.status}`, userId, videoCount, feature, createdAt: Date.now() })
          return
        }

        console.log(`[video-generate] Job ${jobId}: Success (fallback)! videos=${fallbackData.media?.length || 0}`)
        videoJobs.set(jobId, { id: jobId, status: "done", data: fallbackData, userId, videoCount, feature, createdAt: Date.now() })
        return
      }

      // Any other error
      if (!response.ok) {
        console.error(`[video-generate] Job ${jobId}: API error ${response.status}`)
        videoJobs.set(jobId, { id: jobId, status: "error", error: data.error || `API error: ${response.status}`, userId, videoCount, feature, createdAt: Date.now() })
        return
      }

      // Success — store result (credits deducted later when client picks it up)
      console.log(`[video-generate] Job ${jobId}: Success! jobId=${data.jobId}, videos=${data.media?.length || 0}`)
      videoJobs.set(jobId, { id: jobId, status: "done", data, userId, videoCount, feature, createdAt: Date.now() })
      return
    }

    videoJobs.set(jobId, { id: jobId, status: "error", error: "All retry attempts exhausted", userId, videoCount, feature, createdAt: Date.now() })
  } catch (error) {
    console.error(`[video-generate] Job ${jobId}: Fatal error:`, error)
    videoJobs.set(jobId, {
      id: jobId, status: "error",
      error: error instanceof Error ? error.message : "Generation failed",
      userId, videoCount, feature, createdAt: Date.now(),
    })
  }
}

/**
 * POST /api/ai/video-generate
 * Starts video generation. New clients (async:true) get jobId immediately.
 * Old clients block until complete.
 */
export async function POST(req: NextRequest) {
  const token = process.env.USEAPI_TOKEN
  if (!token) {
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

    const videoCount = count || 1
    const requiredCredits = videoCount * CREDIT_COST_VIDEO
    const credits = await prisma.user_credits.findUnique({ where: { userId: session.user.id } })
    const currentBalance = credits?.balance ?? 0

    if (currentBalance < requiredCredits) {
      return NextResponse.json(
        { error: `Kredit tidak cukup. Butuh ${requiredCredits}, saldo: ${currentBalance}` },
        { status: 402 }
      )
    }

    const basePayload: Record<string, unknown> = {
      prompt,
      model: model || "veo-3.1-fast",
      aspectRatio: aspectRatio || "landscape",
      duration: duration || 8,
      count: videoCount,
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
    const feat = feature || "video-generator"

    if (useAsync) {
      // ── ASYNC MODE ──
      const jobId = `vj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      videoJobs.set(jobId, { id: jobId, status: "processing", userId: session.user.id, videoCount, feature: feat, createdAt: Date.now() })

      runVideoGeneration(jobId, basePayload, mode, session.user.id, videoCount, feat)

      console.log(`[video-generate] Job ${jobId} started ASYNC (mode=${mode}, model=${basePayload.model})`)

      return NextResponse.json({ jobId, status: "processing" })
    } else {
      // ── SYNC MODE (backward compatible) ──
      const jobId = `vj-sync-${Date.now()}`
      videoJobs.set(jobId, { id: jobId, status: "processing", userId: session.user.id, videoCount, feature: feat, createdAt: Date.now() })

      console.log(`[video-generate] Job ${jobId} started SYNC (mode=${mode}, model=${basePayload.model})`)

      await runVideoGeneration(jobId, basePayload, mode, session.user.id, videoCount, feat)

      const job = videoJobs.get(jobId)
      videoJobs.delete(jobId)

      if (!job || job.status === "error") {
        return NextResponse.json({ error: job?.error || "Generation failed" }, { status: 500 })
      }

      // Deduct credits now (sync = client is waiting and will get the result)
      const deducted = await deductCredits(session.user.id, videoCount, feat)

      // Extract media from UseAPI response (may be at data.media or data.response.media)
      const apiData = job.data || {}
      const media = (apiData.media as unknown[]) || (apiData.response as Record<string, unknown>)?.media || []

      return NextResponse.json({
        jobId: (apiData.jobId as string) || (apiData.jobid as string) || jobId,
        media,
        remainingCredits: (apiData.remainingCredits as number) || (apiData.response as Record<string, unknown>)?.remainingCredits,
        creditsDeducted: deducted,
      })
    }
  } catch (error) {
    console.error("Video generation error:", error)
    return NextResponse.json({ error: "Failed to start video generation" }, { status: 500 })
  }
}

/**
 * GET /api/ai/video-generate?jobId=xxx
 * Poll for status. Credits are deducted when client picks up "done" result.
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
    videoJobs.delete(jobId)
    return NextResponse.json({ jobId, status: "error", error: job.error }, { status: 500 })
  }

  // Done — deduct credits NOW (client is picking up the result = user will see the video)
  let creditsDeducted = job.creditsDeducted || 0
  if (!job.creditsDeducted) {
    creditsDeducted = await deductCredits(job.userId, job.videoCount, job.feature)
    job.creditsDeducted = creditsDeducted
  }

  // Extract media from UseAPI response (may be at data.media or data.response.media)
  const apiData = job.data || {}
  const media = (apiData.media as unknown[]) || (apiData.response as Record<string, unknown>)?.media || []

  videoJobs.delete(jobId)

  // Return clean response — DO NOT spread raw UseAPI data (it has status:"completed" that overrides our status:"done"!)
  return NextResponse.json({
    jobId,
    status: "done",
    media,
    remainingCredits: (apiData.remainingCredits as number) || (apiData.response as Record<string, unknown>)?.remainingCredits,
    creditsDeducted,
  })
}

export const maxDuration = 300
