export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { CREDIT_COST_IMAGE, guardAccess, refundCredits } from "@/lib/credit-guard"
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
  const processMediaArray = (arr: any[]) => {
    return arr.map((m) => {
      const gen = m.image?.generatedImage
      const rawMgId = gen?.mediaGenerationId
      const resolvedMgId = rawMgId && typeof rawMgId === "object" ? rawMgId.mediaGenerationId : rawMgId
      return {
        url: gen?.fifeUrl || gen?.uri,
        mediaGenerationId: resolvedMgId,
      }
    }).filter((m) => m.url)
  }

  if (Array.isArray(data.media)) return processMediaArray(data.media)
  if (Array.isArray(data.images)) return data.images as Record<string, unknown>[]
  
  const response = data.response as Record<string, unknown> | undefined
  if (response && Array.isArray(response.media)) return processMediaArray(response.media)
  if (response && Array.isArray(response.images)) return response.images as Record<string, unknown>[]

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
        const rawMgId = op.mediaGenerationId
        const resolvedMgId = rawMgId && typeof rawMgId === "object" ? (rawMgId as any).mediaGenerationId : rawMgId
        return {
          url: imageUrl,
          mediaGenerationId: resolvedMgId as string | undefined,
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
    const { prompt, model, aspectRatio, count, seed, references, characters, email } = body
    const useAsync = body.async === true

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 })
    }

    const imageCount = count || 1
    const creditCost = imageCount * CREDIT_COST_IMAGE
    
    // ── Subscription / Credit guard ──
    const accessResult = await guardAccess(
      session.user.id,
      creditCost,
      "image-generator",
      `Generate ${imageCount} gambar (${model || "imagen-4"})`
    )

    if (!accessResult.ok) {
      return NextResponse.json(
        { error: accessResult.reason },
        { status: 402 }
      )
    }

    const shouldRefundOnError = accessResult.method === "credits"

    // Build base payload (without captcha)
    const basePayload: Record<string, unknown> = {
      prompt,
      model: model || "nano-banana-pro",
      aspectRatio: aspectRatio || "9:16",
      count: imageCount,
    }

    if (useAsync) {
      const appUrl = process.env.NEXTAUTH_URL || ""
      const isProduction = !appUrl.includes("localhost") && !appUrl.includes("127.0.0.1")
      // ALWAYS SET replyUrl FOR DEBUGGING PURPOSES (Even on localhost, though it won't be reachable)
      // Wait, UseAPI won't be able to hit localhost.
      // Is the user running this on a live domain or ngrok?
      // Next.js URL is usually in NEXTAUTH_URL. We will set it.
      const secret = (process.env.NEXTAUTH_SECRET || "").slice(0, 16)
      // Only set it if it's not localhost, otherwise UseAPI will reject the URL format.
      // Wait, the user said "coba di log dong hasil replyUrl yang di tangkep".
      // That means UseAPI is successfully hitting the webhook! So NEXTAUTH_URL is a public domain (e.g. ngrok or deployed server).
      if (appUrl) {
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

    // Character refs → character_1..7 (separate from reference images)
    if (characters && Array.isArray(characters)) {
      characters.forEach((charRef: string, i: number) => {
        basePayload[`character_${i + 1}`] = charRef
      })
    }
    // Also forward character_N keys sent directly by the generation queue
    for (const key of Object.keys(body)) {
      if (/^character_\d+$/.test(key) && !basePayload[key]) {
        basePayload[key] = body[key]
      }
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
          console.error(`[image-generate] Fallback API error ${fallbackResponse.status}:`, fallbackData)
          // ── Refund on failure (only if credits were deducted) ──
          if (shouldRefundOnError) await refundCredits(session.user.id, creditCost, feature)
          
          const errMsg = typeof fallbackData.error === 'string' 
            ? (fallbackData.response?.error?.message ? `${fallbackData.error}: ${fallbackData.response.error.message}` : fallbackData.error)
            : (fallbackData.error?.message || fallbackData.error || `API error: ${fallbackResponse.status}`)
            
          return NextResponse.json(
            { error: errMsg },
            { status: fallbackResponse.status }
          )
        }

        return handlePostResponse(fallbackData, useAsync, session.user.id, creditCost, feature, accessResult.balance)
      }

      if (!response.ok) {
        console.error(`[image-generate] API error ${response.status}:`, data)
        // ── Refund on failure ──
        await refundCredits(session.user.id, creditCost, feature)
        
        // Handle new UseAPI error shape (classification string in data.error, Google's error in data.response.error)
        const errMsg = typeof data.error === 'string' 
          ? (data.response?.error?.message ? `${data.error}: ${data.response.error.message}` : data.error)
          : (data.error?.message || data.error || `API error: ${response.status}`)
          
        return NextResponse.json(
          { error: errMsg },
          { status: response.status }
        )
      }

      // Success
      return handlePostResponse(data, useAsync, session.user.id, creditCost, feature, accessResult.balance)
    }

    // Should never reach here, but refund just in case
    if (shouldRefundOnError) await refundCredits(session.user.id, creditCost, feature)
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

  // UseAPI /images is SYNCHRONOUS — the response already contains the full
  // media array.  Extract it now so we never lose it.
  const media = extractMedia(data)

  console.log(
    `[image-generate] POST response: jobId=${useapiJobId}, media=${media.length}, async=${useAsync}`
  )

  if (useAsync) {
    // Store the result in DB cache so the very first client poll returns it.
    if (useapiJobId && media.length > 0) {
      await storeImageJobResult(useapiJobId, {
        media,
        timestamp: Date.now(),
        status: "done",
      })
      console.log(`[image-generate] Cached ${media.length} images for job ${useapiJobId}`)
    }
    if (useapiJobId) {
      await storeImageJobMeta(useapiJobId, { userId, creditCost, feature })
    }
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

  // ── Fast path: check DB cache (populated by polling completion) ──
  const cached = await getImageJobResult(useapiJobId)
  if (cached && cached.status === "error") {
    return NextResponse.json(
      { jobId: useapiJobId, status: "error", error: cached.error || "Generation failed" },
      { status: 500 }
    )
  }
  // Ignore cache if it erroneously stored an empty array
  if (cached && cached.status === "done" && cached.media && cached.media.length > 0) {
    console.log(`[image-generate] Cache hit for job ${useapiJobId}`)
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
      cache: 'no-store'
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

      return NextResponse.json({ 
        jobId: useapiJobId, 
        status: "done", 
        images: media,
        ...(media.length === 0 && { rawData: data })
      })
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
