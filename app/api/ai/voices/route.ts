import { NextResponse } from "next/server"
import { listVoices } from "@/lib/api/elevenlabs"

/**
 * GET /api/ai/voices
 * Returns available voices from ElevenLabs
 */
export async function GET() {
  try {
    const voices = await listVoices()
    return NextResponse.json({ voices })
  } catch (error) {
    console.error("[voices] Error listing voices:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch voices" },
      { status: 500 }
    )
  }
}
