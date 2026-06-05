import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { CREDIT_COST_TTS, deductCredits, refundCredits } from "@/lib/credit-guard"
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

    // ── Credit deduction ──
    const deductResult = await deductCredits(
      session.user.id,
      CREDIT_COST_TTS,
      "text-to-speech",
      `TTS: ${text.slice(0, 50)}${text.length > 50 ? "..." : ""}`
    )

    if (!deductResult.ok) {
      return NextResponse.json(
        { error: `Kredit tidak cukup. Butuh ${CREDIT_COST_TTS}, saldo: ${deductResult.balance}` },
        { status: 402 }
      )
    }

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
        "X-Credits-Deducted": String(CREDIT_COST_TTS),
        "X-Credits-Balance": String(deductResult.balance),
      },
    })
  } catch (error) {
    console.error("[tts] Error:", error)

    // Attempt refund
    try {
      const session2 = await auth()
      if (session2?.user?.id) {
        await refundCredits(session2.user.id, CREDIT_COST_TTS, "text-to-speech")
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
