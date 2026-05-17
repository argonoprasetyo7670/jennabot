import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const USEAPI_BASE = "https://api.useapi.net/v1/google-flow"
const CAPTCHA_BROKER_URL = process.env.CAPTCHA_BROKER_URL || "http://localhost:4000"
const CAPTCHA_BROKER_KEY = process.env.CAPTCHA_BROKER_KEY || "sk-admin-change-me"
const MAX_CAPTCHA_RETRIES = 3

/** Credit cost per video — must match CREDIT_COST_VIDEO in generation-queue.tsx */
const CREDIT_COST_VIDEO = 10

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
 * Deduct credits for a user after successful generation.
 */
async function deductCredits(userId: string, videoCount: number, feature: string) {
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
 * Run the actual video generation (called in background).
 */
async function runVideoGeneration(
  jobId: string,
  basePayload: Record<string, unknown>,
  mode: string,
  userId: string,
  feature: string
) {
  const token = process.env.USEAPI_TOKEN!
  const videoCount = (basePayload.count as number) || 1

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

        // Success (fallback) — deduct credits
        const deducted = await deductCredits(userId, videoCount, feature)
        console.log(`[video-generate] Job ${jobId}: Success (fallback)! videos=${fallbackData.media?.length || 0}`)
        videoJobs.set(jobId, { id: jobId, status: "done", data: fallbackData, creditsDeducted: deducted, createdAt: Date.now() })
        return
      }

      // Any other error
      if (!response.ok) {
        console.error(`[video-generate] Job ${jobId}: API error ${response.status}`)
        videoJobs.set(jobId, { id: jobId, status: "error", error: data.error || `API error: ${response.status}`, createdAt: Date.now() })
        return
      }

      // Success — deduct credits
      const deducted = await deductCredits(userId, videoCount, feature)
      console.log(`[video-generate] Job ${jobId}: Success! jobId=${data.jobId}, videos=${data.media?.length || 0}`)
      videoJobs.set(jobId, { id: jobId, status: "done", data, creditsDeducted: deducted, createdAt: Date.now() })
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
 * Credits are deducted server-side upon successful generation.
 * Client should poll GET /api/ai/video-generate?jobId=xxx for results.
 */
export async function POST(req: NextRequest) {
  const token = process.env.USEAPI_TOKEN
  if (!token) {
    return NextResponse.json({ error: "USEAPI_TOKEN not configured" }, { status: 500 })
  }

  // Auth check
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      prompt, model, aspectRatio, duration, count, seed,
      startImage, endImage, referenceImages, voice, email,
      feature, // optional: "video-generator", "review-product", etc.
    } = body

    // New clients send async:true for polling mode
    const useAsync = body.async === true

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 })
    }

    // Check credit balance before starting
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

    // Build base payload
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

    if (useAsync) {
      // ── ASYNC MODE (new clients) ──
      // Return jobId immediately, client polls GET for results
      const jobId = `vj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      videoJobs.set(jobId, { id: jobId, status: "processing", createdAt: Date.now() })

      runVideoGeneration(jobId, basePayload, mode, session.user.id, feature || "video-generator")

      console.log(`[video-generate] Job ${jobId} started ASYNC (mode=${mode}, model=${basePayload.model}, user=${session.user.id})`)

      return NextResponse.json({
        jobId,
        status: "processing",
        message: "Poll GET /api/ai/video-generate?jobId=xxx for results.",
      })
    } else {
      // ── SYNC MODE (old clients / backward compatible) ──
      // Block until generation completes (may timeout on Safari)
      const jobId = `vj-sync-${Date.now()}`
      videoJobs.set(jobId, { id: jobId, status: "processing", createdAt: Date.now() })

      console.log(`[video-generate] Job ${jobId} started SYNC (mode=${mode}, model=${basePayload.model}, user=${session.user.id})`)

      await runVideoGeneration(jobId, basePayload, mode, session.user.id, feature || "video-generator")

      const job = videoJobs.get(jobId)
      videoJobs.delete(jobId)

      if (!job || job.status === "error") {
        return NextResponse.json(
          { error: job?.error || "Generation failed" },
          { status: 500 }
        )
      }

      return NextResponse.json(job.data)
    }
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
 * Returns creditsDeducted when done so client can update UI.
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

  // Done — return the full UseAPI response data + creditsDeducted
  const creditsDeducted = job.creditsDeducted
  videoJobs.delete(jobId)
  return NextResponse.json({ jobId, status: "done", creditsDeducted, ...job.data })
}

// Keep maxDuration for the POST handler context
export const maxDuration = 300
