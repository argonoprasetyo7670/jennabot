import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { readFileSync } from "fs"
import { join } from "path"

// Load system prompt from .md file (cached at module level)
const SYSTEM_PROMPT = readFileSync(
  join(process.cwd(), "app/api/ai/workflow-agent/system-prompt.md"),
  "utf-8"
)

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
  }

  try {
    const { messages, canvas } = await req.json()

    // Build conversation for OpenAI
    const openaiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ]

    // If canvas data is provided, add it as context
    if (canvas) {
      const nodesSummary = (canvas.nodes || []).map((n: { id: string; type: string; data: Record<string, unknown> }) => ({
        id: n.id, type: n.type, data: n.data,
      }))
      const edgesSummary = (canvas.edges || []).map((e: { source: string; target: string; sourceHandle: string; targetHandle: string }) => ({
        from: e.source, to: e.target, sourcePort: e.sourceHandle, targetPort: e.targetHandle,
      }))

      openaiMessages.push({
        role: "system",
        content: `## Canvas saat ini:\nNodes (${nodesSummary.length}): ${JSON.stringify(nodesSummary)}\nEdges (${edgesSummary.length}): ${JSON.stringify(edgesSummary)}`,
      })
    }

    // Add conversation history (last 10 messages)
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
        max_tokens: 800,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("[workflow-agent] OpenAI error:", err)
      return NextResponse.json({ error: "AI service error" }, { status: 502 })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || "Maaf, saya tidak bisa merespons saat ini."

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("[workflow-agent] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
