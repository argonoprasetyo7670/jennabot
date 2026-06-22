import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { CREDIT_COST_SFX, guardAccess, refundCredits } from "@/lib/credit-guard"
import { sfxGenerate } from "@/lib/api/elevenlabs"

/**
 * POST /api/ai/sfx
 * Generate sound effects from text description using ElevenLabs API.
 * Returns audio/mpeg binary.
 */
export async function POST(req: NextRequest) {
  // ── Auth check ──
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let shouldRefundOnError = false

  try {
    const body = await req.json()
    const { text, durationSeconds } = body

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "text is required" }, { status: 400 })
    }

    if (text.length > 1000) {
      return NextResponse.json(
        { error: "Deskripsi terlalu panjang. Maksimal 1000 karakter." },
        { status: 400 }
      )
    }

    if (durationSeconds !== undefined) {
      const dur = Number(durationSeconds)
      if (isNaN(dur) || dur < 0.5 || dur > 22) {
        return NextResponse.json(
          { error: "Durasi harus antara 0.5 dan 22 detik." },
          { status: 400 }
        )
      }
    }

    // ── Subscription / Credit guard ──
    const accessResult = await guardAccess(
      session.user.id,
      CREDIT_COST_SFX,
      "sound-effects",
      `SFX: ${text.slice(0, 50)}${text.length > 50 ? "..." : ""}`
    )

    if (!accessResult.ok) {
      return NextResponse.json(
        { error: accessResult.reason },
        { status: 402 }
      )
    }

    shouldRefundOnError = accessResult.method === "credits"

    // ── Generate sound effect ──
    const audioBuffer = await sfxGenerate({
      text: text.trim(),
      durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
    })

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="sfx-${Date.now()}.mp3"`,
        "X-Credits-Deducted": String(accessResult.method === "credits" ? CREDIT_COST_SFX : 0),
        "X-Credits-Balance": String(accessResult.balance),
      },
    })
  } catch (error) {
    console.error("[sfx] Error:", error)

    // Attempt refund (only if credits were deducted)
    try {
      if (shouldRefundOnError) {
        const session2 = await auth()
        if (session2?.user?.id) {
          await refundCredits(session2.user.id, CREDIT_COST_SFX, "sound-effects")
        }
      }
    } catch (refundErr) {
      console.error("[sfx] Refund error:", refundErr)
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate sound effect" },
      { status: 500 }
    )
  }
}

export const maxDuration = 60
