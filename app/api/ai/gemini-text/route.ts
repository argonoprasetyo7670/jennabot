import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { guardAccess, refundCredits, CREDIT_COST_CHAT } from "@/lib/credit-guard"

/**
 * POST /api/ai/gemini-text
 * Generate text using Gemini API
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let shouldRefundOnError = false

  try {
    const body = await req.json()
    const { prompt, systemPrompt, model, temperature, maxTokens } = body

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 })
    }

    // ── Subscription / Credit guard ──
    const accessResult = await guardAccess(
      session.user.id,
      CREDIT_COST_CHAT, // Use chat credit cost for text generation
      "ai-text-generation",
      `Prompt: ${prompt.slice(0, 50)}...`
    )

    if (!accessResult.ok) {
      return NextResponse.json(
        { error: accessResult.reason },
        { status: 402 }
      )
    }
    shouldRefundOnError = accessResult.method === "credits"

    // ── Generate Text ──
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is not configured")
    }

    const targetModel = model === "openai" ? "gemini-2.0-flash" : "gemini-2.0-flash" // Simplified to use Gemini for both currently

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      generationConfig: {
        temperature: temperature ?? 0.7,
        maxOutputTokens: maxTokens ?? 1000,
      }
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Gemini API error: ${res.status}`)
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

    return NextResponse.json({ text }, {
      headers: {
        "X-Credits-Deducted": String(accessResult.method === "credits" ? CREDIT_COST_CHAT : 0),
        "X-Credits-Balance": String(accessResult.balance),
      }
    })

  } catch (error) {
    console.error("[gemini-text] Error:", error)

    if (shouldRefundOnError) {
      try {
        const session2 = await auth()
        if (session2?.user?.id) {
          await refundCredits(session2.user.id, CREDIT_COST_CHAT, "ai-text-generation")
        }
      } catch (refundErr) {
        console.error("[gemini-text] Refund error:", refundErr)
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate text" },
      { status: 500 }
    )
  }
}
