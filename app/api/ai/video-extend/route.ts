import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { deductCredits } from "@/lib/credits"

const USEAPI_BASE = "https://api.useapi.net/v1/google-flow"
const CAPTCHA_BROKER_URL = process.env.CAPTCHA_BROKER_URL || "http://localhost:4000"
const CAPTCHA_BROKER_KEY = process.env.CAPTCHA_BROKER_KEY || "sk-admin-change-me"
const MAX_CAPTCHA_RETRIES = 3
const CREDIT_COST_VIDEO = 5

async function getCaptchaToken(): Promise<string | null> {
  try {
    const res = await fetch(`${CAPTCHA_BROKER_URL}/token?action=VIDEO_GENERATION`, {
      headers: { "X-API-Key": CAPTCHA_BROKER_KEY },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.token || null
  } catch {
    return null
  }
}

/**
 * POST /api/ai/video-extend
 * Extends a previously generated video using UseAPI's /videos/extend endpoint.
 * Requires mediaGenerationId from a previous video generation.
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
    const { mediaGenerationId, prompt, model, count, seed } = body

    if (!mediaGenerationId) {
      return NextResponse.json({ error: "mediaGenerationId is required" }, { status: 400 })
    }
    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 })
    }

    // Check credit balance
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

    // Build payload
    const basePayload: Record<string, unknown> = {
      mediaGenerationId,
      prompt,
    }
    if (model) basePayload.model = model
    if (count) basePayload.count = count
    if (seed !== undefined && seed !== null) basePayload.seed = seed

    // Try with captcha, retry on 403
    for (let attempt = 1; attempt <= MAX_CAPTCHA_RETRIES; attempt++) {
      const captchaToken = await getCaptchaToken()
      const payload = { ...basePayload }
      if (captchaToken) payload.captchaToken = captchaToken

      console.log(`[video-extend] Attempt ${attempt}/${MAX_CAPTCHA_RETRIES} (captcha: ${captchaToken ? "yes" : "no"})`)

      const response = await fetch(`${USEAPI_BASE}/videos/extend`, {
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
        console.warn(`[video-extend] 403 captcha rejected, retrying...`)
        continue
      }

      // 403 on last attempt → try without captcha
      if (response.status === 403 && attempt === MAX_CAPTCHA_RETRIES) {
        console.warn(`[video-extend] All captcha failed, trying without token...`)
        const fallbackRes = await fetch(`${USEAPI_BASE}/videos/extend`, {
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
        return handleResponse(fallbackData, session.user.id, videoCount)
      }

      if (!response.ok) {
        console.error(`[video-extend] API error ${response.status}:`, JSON.stringify(data))
        return NextResponse.json({ error: data.error || `API error: ${response.status}` }, { status: response.status })
      }

      return handleResponse(data, session.user.id, videoCount)
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  } catch (error) {
    console.error("Video extend error:", error)
    return NextResponse.json({ error: "Failed to extend video" }, { status: 500 })
  }
}

async function handleResponse(
  data: Record<string, unknown>,
  userId: string,
  videoCount: number
) {
  const media = Array.isArray(data.media) ? data.media as Record<string, unknown>[] : []
  const creditsDeducted = await deductCredits(userId, videoCount * CREDIT_COST_VIDEO, "video-extend")

  console.log(`[video-extend] Done. videos=${media.length}, credits=${creditsDeducted}`)

  return NextResponse.json({
    jobId: data.jobId || "",
    status: "done",
    media,
    creditsDeducted,
  })
}

export const maxDuration = 300
