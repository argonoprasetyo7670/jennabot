import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { CREDIT_COST_IMAGE, deductCredits, refundCredits } from "@/lib/credit-guard"

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

    if (seed !== undefined && seed !== null) basePayload.seed = seed
    if (email) basePayload.email = email

    if (references && Array.isArray(references)) {
      references.forEach((ref: string, i: number) => {
        basePayload[`reference_${i + 1}`] = ref
      })
    }

    // Try with captcha token, retry up to MAX_CAPTCHA_RETRIES on 403
    for (let attempt = 1; attempt <= MAX_CAPTCHA_RETRIES; attempt++) {
      const captchaToken = await getCaptchaToken()
      const payload = { ...basePayload }
      if (captchaToken) payload.captchaToken = captchaToken

      console.log(`[image-generate] Attempt ${attempt}/${MAX_CAPTCHA_RETRIES} (captcha: ${captchaToken ? "yes" : "no"})`)

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
          await refundCredits(session.user.id, creditCost, "image-generator")
          return NextResponse.json(
            { error: fallbackData.error || `API error: ${fallbackResponse.status}` },
            { status: fallbackResponse.status }
          )
        }

        return NextResponse.json({
          ...fallbackData,
          creditsDeducted: creditCost,
          remainingBalance: deductResult.balance,
        })
      }

      // Any other error
      if (!response.ok) {
        // ── Refund on failure ──
        await refundCredits(session.user.id, creditCost, "image-generator")
        return NextResponse.json(
          { error: data.error || `API error: ${response.status}` },
          { status: response.status }
        )
      }

      // Success
      return NextResponse.json({
        ...data,
        creditsDeducted: creditCost,
        remainingBalance: deductResult.balance,
      })
    }

    // Should never reach here, but refund just in case
    await refundCredits(session.user.id, creditCost, "image-generator")
    return NextResponse.json({ error: "Unexpected error in retry loop" }, { status: 500 })
  } catch (error) {
    console.error("Image generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate images" },
      { status: 500 }
    )
  }
}

// Captcha long-poll (60s) + generation (20s) + retries
export const maxDuration = 300
