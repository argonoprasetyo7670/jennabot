import { NextRequest, NextResponse } from "next/server"

const USEAPI_BASE = "https://api.useapi.net/v1/google-flow"
const CAPTCHA_BROKER_URL = process.env.CAPTCHA_BROKER_URL || "http://localhost:4000"
const CAPTCHA_BROKER_KEY = process.env.CAPTCHA_BROKER_KEY || "sk-admin-change-me"
const MAX_CAPTCHA_RETRIES = 3

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
 * POST /api/ai/video-generate
 * Proxy to UseAPI Google Flow video generation endpoint.
 * Supports: T2V, I2V (start/end frames), R2V (reference images), voice narration.
 * Video generation takes 60-180 seconds depending on model.
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

    // Build base payload (without captcha)
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

    // Reference images (R2V mode) — referenceImage_1 to _3
    if (referenceImages && Array.isArray(referenceImages)) {
      referenceImages.forEach((ref: string, i: number) => {
        basePayload[`referenceImage_${i + 1}`] = ref
      })
    }

    const mode = startImage ? "I2V" : referenceImages?.length ? "R2V" : "T2V"

    // Try with captcha token, retry up to MAX_CAPTCHA_RETRIES on 403
    for (let attempt = 1; attempt <= MAX_CAPTCHA_RETRIES; attempt++) {
      const captchaToken = await getCaptchaToken()
      const payload = { ...basePayload }
      if (captchaToken) payload.captchaToken = captchaToken

      console.log(`[video-generate] Attempt ${attempt}/${MAX_CAPTCHA_RETRIES} mode=${mode} model=${payload.model} (captcha: ${captchaToken ? "yes" : "no"})`)
      console.log(`[video-generate] Payload:`, JSON.stringify(payload, null, 2))

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
        console.warn(`[video-generate] 403 captcha rejected, response:`, JSON.stringify(data))
        continue
      }

      // 403 on last attempt → try without captcha token
      if (response.status === 403 && attempt === MAX_CAPTCHA_RETRIES) {
        console.warn("[video-generate] All captcha attempts failed, trying without token...")
        const fallbackPayload = { ...basePayload } // no captchaToken

        const fallbackResponse = await fetch(`${USEAPI_BASE}/videos`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fallbackPayload),
        })

        const fallbackData = await fallbackResponse.json()

        if (!fallbackResponse.ok) {
          return NextResponse.json(
            { error: fallbackData.error || `API error: ${fallbackResponse.status}` },
            { status: fallbackResponse.status }
          )
        }

        return NextResponse.json(fallbackData)
      }

      // Any other error
      if (!response.ok) {
        console.error(`[video-generate] API error ${response.status}:`, JSON.stringify(data, null, 2))
        return NextResponse.json(
          { error: data.error || `API error: ${response.status}` },
          { status: response.status }
        )
      }

      // Success
      console.log(`[video-generate] Success! jobId=${data.jobId}, videos=${data.media?.length || 0}`)
      return NextResponse.json(data)
    }

    // Should never reach here, but just in case
    return NextResponse.json({ error: "Unexpected error in retry loop" }, { status: 500 })
  } catch (error) {
    console.error("Video generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate videos" },
      { status: 500 }
    )
  }
}

// Video generation (60-180s) + captcha long-poll + retries
export const maxDuration = 300
