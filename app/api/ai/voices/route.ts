import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { listVoices } from "@/lib/api/elevenlabs"

/**
 * GET /api/ai/voices
 * Returns list of available ElevenLabs voices.
 * Cached for 5 minutes via Cache-Control header.
 */
export async function GET() {
  // ── Auth check ──
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const voices = await listVoices()

    return NextResponse.json(
      { voices },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      }
    )
  } catch (error) {
    console.error("[voices] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch voices" },
      { status: 500 }
    )
  }
}
