import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { readFileSync } from "fs"
import { join } from "path"
import { CREDIT_COST_CHAT, guardAccess, refundCredits } from "@/lib/credit-guard"

// Load system prompt from .md file (cached at module level)
const SYSTEM_PROMPT = readFileSync(
  join(process.cwd(), "app/api/ai/workflow-agent/system-prompt.md"),
  "utf-8"
)

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
  }

  try {
    // ── Subscription / Credit guard ──
    const accessResult = await guardAccess(
      session.user.id,
      CREDIT_COST_CHAT,
      "workflow-agent",
      "Workflow Agent chat request"
    )

    if (!accessResult.ok) {
      return NextResponse.json(
        { error: accessResult.reason },
        { status: 402 }
      )
    }

    const shouldRefundOnError = accessResult.method === "credits"

    const { messages, canvas } = await req.json()

    // Build conversation for OpenAI
    const openaiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ]

    // Add canvas context
    if (canvas) {
      const nodesSummary = (canvas.nodes || []).map((n: { id: string; type: string; data: Record<string, unknown> }) => ({
        id: n.id, type: n.type, data: n.data,
      }))
      const edgesSummary = (canvas.edges || []).map((e: { source: string; target: string; sourceHandle: string; targetHandle: string }) => ({
        from: e.source, to: e.target, srcPort: e.sourceHandle, tgtPort: e.targetHandle,
      }))

      openaiMessages.push({
        role: "system",
        content: `Canvas saat ini — Nodes (${nodesSummary.length}): ${JSON.stringify(nodesSummary)} | Edges (${edgesSummary.length}): ${JSON.stringify(edgesSummary)}`,
      })
    }

    // Add conversation history (last 10)
    const recent = (messages || []).slice(-10)
    for (const msg of recent) {
      openaiMessages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text,
      })
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        max_tokens: 1500,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      // ── Refund on failure (only if credits were deducted) ──
      if (shouldRefundOnError) await refundCredits(session.user.id, CREDIT_COST_CHAT, "workflow-agent")
      const err = await response.text()
      console.error("[workflow-agent] OpenAI error:", err)
      return NextResponse.json({ error: "AI service error" }, { status: 502 })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || "{}"

    // Parse structured response
    let parsed: { reply?: string; actions?: unknown[] }
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Fallback: treat entire response as text reply
      parsed = { reply: raw, actions: [] }
    }

    return NextResponse.json({
      reply: parsed.reply || "Siap!",
      actions: parsed.actions || [],
    })
  } catch (error) {
    console.error("[workflow-agent] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
