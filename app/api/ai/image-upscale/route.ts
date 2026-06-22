import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { CREDIT_COST_UPSCALE, guardAccess, refundCredits } from "@/lib/credit-guard"

/**
 * POST /api/ai/image-upscale
 * Proxy to UseAPI Google Flow upscale endpoint.
 * Body: { mediaGenerationId: string, resolution?: "2k" | "4k" }
 * Returns: { encodedImage: string } (base64 JPEG)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { mediaGenerationId, resolution = "2k" } = body

    if (!mediaGenerationId) {
      return NextResponse.json({ error: "mediaGenerationId is required" }, { status: 400 })
    }

    if (!["2k", "4k"].includes(resolution)) {
      return NextResponse.json({ error: "resolution must be '2k' or '4k'" }, { status: 400 })
    }

    const apiToken = process.env.USEAPI_TOKEN
    if (!apiToken) {
      return NextResponse.json({ error: "USEAPI_TOKEN not configured" }, { status: 500 })
    }

    // ── Subscription / Credit guard ──
    const accessResult = await guardAccess(
      session.user.id,
      CREDIT_COST_UPSCALE,
      "image-upscale",
      `Upscale gambar ke ${resolution}`
    )

    if (!accessResult.ok) {
      return NextResponse.json(
        { error: accessResult.reason },
        { status: 402 }
      )
    }

    const shouldRefundOnError = accessResult.method === "credits"

    const res = await fetch("https://api.useapi.net/v1/google-flow/images/upscale", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mediaGenerationId, resolution }),
    })

    const data = await res.json()

    if (!res.ok) {
      // ── Refund on failure (only if credits were deducted) ──
      if (shouldRefundOnError) await refundCredits(session.user.id, CREDIT_COST_UPSCALE, "image-upscale")
      const errorMsg = typeof data.error === "string"
        ? data.error
        : data.error?.message || `Upscale failed (${res.status})`
      return NextResponse.json({ error: errorMsg }, { status: res.status })
    }

    if (!data.encodedImage) {
      // ── Refund — no image returned (only if credits were deducted) ──
      if (shouldRefundOnError) await refundCredits(session.user.id, CREDIT_COST_UPSCALE, "image-upscale")
      return NextResponse.json({ error: "No upscaled image returned" }, { status: 500 })
    }

    return NextResponse.json({
      encodedImage: data.encodedImage,
      creditsDeducted: accessResult.method === "credits" ? CREDIT_COST_UPSCALE : 0,
      remainingBalance: accessResult.balance,
    })
  } catch (err) {
    console.error("[image-upscale] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
