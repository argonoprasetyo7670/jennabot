import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { CREDIT_COST_IMAGE, deductCredits, refundCredits } from "@/lib/credit-guard"
import { storeImageJobMeta, getImageJobResult, storeImageJobResult } from "@/lib/credits"

const USEAPI_BASE = "https://api.useapi.net/v1/google-flow"
const CAPTCHA_BROKER_URL = process.env.CAPTCHA_BROKER_URL || "http://localhost:4000"
const CAPTCHA_BROKER_KEY = process.env.CAPTCHA_BROKER_KEY || "sk-admin-change-me"
const MAX_CAPTCHA_RETRIES = 3

/**
 * Fetch a reCAPTCHA token from the captcha broker (action: IMAGE_GENERATION).
 */
async function getCaptchaToken(): Promise<string | null> {
  try {
    const res = await fetch(`${CAPTCHA_BROKER_URL}/token?action=IMAGE_GENERATION`, {
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
 * Extract image URLs from UseAPI response.
 */
function extractMedia(data: Record<string, unknown>): Record<string, unknown>[] {
  if (Array.isArray(data.images)) {
    return data.images
  }
  
  const response = data.response as Record<string, unknown> | undefined
  if (response && Array.isArray(response.images)) {
    return response.images
  }

  // Handle async operations format
  if (response && Array.isArray(response.operations)) {
    return (response.operations as Record<string, unknown>[])
      .filter((op) => {
        const status = ((op.status as string) || "").toUpperCase()
        return status.includes("SUCCESS") || status.includes("SUCCEEDED")
      })
      .map((op) => {
        const image = op.image as Record<string, unknown> | undefined
        const imageUrl = (image?.uri || image?.fifeUrl) as string | undefined
        return {
          url: imageUrl,
          mediaGenerationId: op.mediaGenerationId as string | undefined,
        }
      })
      .filter((m) => m.url)
  }

  return []
}

export async function POST(req: NextRequest) {
  const token = process.env.USEAPI_TOKEN
  if (!token) {
    return NextResponse.json({ error: "USEAPI_TOKEN not configured" }, { status: 500 })
  }

  // ── Auth check ──
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { prompt, model, aspectRatio, count, seed, references, email } = body
    const useAsync = body.async === true

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 })
    }

    // ── Credit check & pre-deduct ──
    const imageCount = count || 1
    const creditCost = imageCount * CREDIT_COST_IMAGE
    const deductResult = await deductCredits(
      session.user.id,
      creditCost,
      "image-generator",
      `Generate ${imageCount} gambar (${model || "imagen-4"})`
    )

    if (!deductResult.ok) {
      return NextResponse.json(
        { error: `Kredit tidak cukup. Butuh ${creditCost}, saldo: ${deductResult.balance}` },
        { status: 402 }
      )
    }

    // Build base payload (without captcha)
    const basePayload: Record<string, unknown> = {
      prompt,
      model: model || "nano-banana-pro",
      aspectRatio: aspectRatio || "9:16",
      count: imageCount,
    }

    if (useAsync) {
      basePayload.async = true
      const appUrl = process.env.NEXTAUTH_URL || ""
      const isProduction = !appUrl.includes("localhost") && !appUrl.includes("127.0.0.1")
      if (isProduction) {
        const secret = (process.env.NEXTAUTH_SECRET || "").slice(0, 16)
        basePayload.replyUrl = `${appUrl.replace(/\/$/, "")}/api/ai/image-callback?secret=${encodeURIComponent(secret)}`
        basePayload.replyRef = `jenna-${Date.now()}`
        console.log(`[image-generate] replyUrl set: ${basePayload.replyUrl}`)
      }
    }

    if (seed !== undefined && seed !== null) basePayload.seed = seed
    if (email) basePayload.email = email

    if (references && Array.isArray(references)) {
      references.forEach((ref: string, i: number) => {
        basePayload[`reference_${i + 1}`] = ref
      })
    }

    const feature = "image-generator"

    // Try with captcha token, retry up to MAX_CAPTCHA_RETRIES on 403
    for (let attempt = 1; attempt <= MAX_CAPTCHA_RETRIES; attempt++) {
      const captchaToken = await getCaptchaToken()
      const payload = { ...basePayload }
      if (captchaToken) payload.captchaToken = captchaToken

      console.log(`[image-generate] Attempt ${attempt}/${MAX_CAPTCHA_RETRIES} (captcha: ${captchaToken ? "yes" : "no"}) async=${useAsync}`)

      const response = await fetch(`${USEAPI_BASE}/images`, {
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
        console.warn(`[image-generate] 403 captcha rejected, retrying (${attempt}/${MAX_CAPTCHA_RETRIES})...`)
        continue
      }

      // 403 on last attempt → try without captcha token
      if (response.status === 403 && attempt === MAX_CAPTCHA_RETRIES) {
        console.warn("[image-generate] All captcha attempts failed, trying without token...")
        const fallbackPayload = { ...basePayload } // no captchaToken

        const fallbackResponse = await fetch(`${USEAPI_BASE}/images`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fallbackPayload),
        })

        const fallbackData = await fallbackResponse.json()

        if (!fallbackResponse.ok) {
          // ── Refund on failure ──
          await refundCredits(session.user.id, creditCost, feature)
          return NextResponse.json(
            { error: fallbackData.error || `API error: ${fallbackResponse.status}` },
            { status: fallbackResponse.status }
          )
        }

        return handlePostResponse(fallbackData, useAsync, session.user.id, creditCost, feature, deductResult.balance)
      }

      // Any other error
      if (!response.ok) {
        // ── Refund on failure ──
        await refundCredits(session.user.id, creditCost, feature)
        return NextResponse.json(
          { error: data.error || `API error: ${response.status}` },
          { status: response.status }
        )
      }

      // Success
      return handlePostResponse(data, useAsync, session.user.id, creditCost, feature, deductResult.balance)
    }

    // Should never reach here, but refund just in case
    await refundCredits(session.user.id, creditCost, feature)
    return NextResponse.json({ error: "Unexpected error in retry loop" }, { status: 500 })
  } catch (error) {
    console.error("Image generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate images" },
      { status: 500 }
    )
  }
}

async function handlePostResponse(
  data: Record<string, unknown>,
  useAsync: boolean,
  userId: string,
  creditCost: number,
  feature: string,
  remainingBalance: number
) {
  const useapiJobId = (data.jobid || data.jobId) as string | undefined

  if (useAsync) {
    if (useapiJobId) {
      await storeImageJobMeta(useapiJobId, { userId, creditCost, feature })
    }
    console.log(`[image-generate] Async job started: ${useapiJobId}`)
    return NextResponse.json({ jobId: useapiJobId, status: "processing" })
  } else {
    console.log(`[image-generate] Sync job done: ${useapiJobId}`)
    return NextResponse.json({
      ...data,
      creditsDeducted: creditCost,
      remainingBalance,
    })
  }
}

/**
 * GET /api/ai/image-generate?jobId=xxx
 * Polls UseAPI's job status endpoint.
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
  const cached = await getImageJobResult(useapiJobId)
  if (cached) {
    console.log(`[image-generate] Cache hit for job ${useapiJobId}`)
    if (cached.status === "error") {
      return NextResponse.json(
        { jobId: useapiJobId, status: "error", error: cached.error || "Generation failed" },
        { status: 500 }
      )
    }
    return NextResponse.json({
      jobId: useapiJobId,
      status: "done",
      images: cached.media,
    })
  }

  // ── Fallback: poll UseAPI directly ──
  try {
    const res = await fetch(`${USEAPI_BASE}/jobs/${useapiJobId}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.error(`[image-generate] Poll error ${res.status} for ${useapiJobId}:`, errData)
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
      // It failed on UseAPI side. We need to check if we should refund.
      // We don't automatically refund here because the webhook might have done it, 
      // but to be safe, we can leave refunding entirely to the webhook, OR we can do it here if we track refunds.
      // For now, we return error and let the webhook handle the actual refund logic.
      return NextResponse.json(
        { jobId: useapiJobId, status: "error", error: (data.error as string) || "Image generation failed" },
        { status: 500 }
      )
    }

    if (useapiStatus === "completed") {
      const media = extractMedia(data)

      await storeImageJobResult(useapiJobId, {
        media,
        timestamp: Date.now(),
        status: "done",
      })

      console.log(`[image-generate] Job ${useapiJobId} completed via polling. images=${media.length}`)

      return NextResponse.json({ jobId: useapiJobId, status: "done", images: media })
    }

    return NextResponse.json({ jobId: useapiJobId, status: "processing" })
  } catch (error) {
    console.error(`[image-generate] Poll error for ${useapiJobId}:`, error)
    return NextResponse.json(
      { jobId: useapiJobId, status: "error", error: "Failed to check job status" },
      { status: 500 }
    )
  }
}

// Captcha long-poll (60s) + generation (20s) + retries
export const maxDuration = 300
