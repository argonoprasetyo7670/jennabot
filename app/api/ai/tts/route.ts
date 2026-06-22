import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { CREDIT_COST_TTS, guardAccess, refundCredits } from "@/lib/credit-guard"
import { ttsGenerate } from "@/lib/api/elevenlabs"

/**
 * POST /api/ai/tts
 * Generate speech from text using ElevenLabs TTS API.
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
    const { text, voiceId, modelId, stability, similarityBoost } = body

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "text is required" }, { status: 400 })
    }

    if (!voiceId || typeof voiceId !== "string") {
      return NextResponse.json({ error: "voiceId is required" }, { status: 400 })
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: "Teks terlalu panjang. Maksimal 5000 karakter." },
        { status: 400 }
      )
    }

    // ── Subscription / Credit guard ──
    const accessResult = await guardAccess(
      session.user.id,
      CREDIT_COST_TTS,
      "text-to-speech",
      `TTS: ${text.slice(0, 50)}${text.length > 50 ? "..." : ""}`
    )

    if (!accessResult.ok) {
      return NextResponse.json(
        { error: accessResult.reason },
        { status: 402 }
      )
    }
    shouldRefundOnError = accessResult.method === "credits"

    // ── Generate speech ──
    const audioBuffer = await ttsGenerate({
      text: text.trim(),
      voiceId,
      modelId,
      stability,
      similarityBoost,
    })

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="tts-${Date.now()}.mp3"`,
        "X-Credits-Deducted": String(accessResult.method === "credits" ? CREDIT_COST_TTS : 0),
        "X-Credits-Balance": String(accessResult.balance),
      },
    })
  } catch (error) {
    console.error("[tts] Error:", error)

    // Attempt refund (only if credits were deducted)
    try {
      if (shouldRefundOnError) {
        const session2 = await auth()
        if (session2?.user?.id) {
          await refundCredits(session2.user.id, CREDIT_COST_TTS, "text-to-speech")
        }
      }
    } catch (refundErr) {
      console.error("[tts] Refund error:", refundErr)
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate speech" },
      { status: 500 }
    )
  }
}

export const maxDuration = 60
