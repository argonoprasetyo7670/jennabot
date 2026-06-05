/**
 * ElevenLabs API client with round-robin API key rotation.
 *
 * Uses ELEVENLABS_API_KEY and ELEVENLABS_API_KEY_1 in alternation
 * to distribute load and avoid per-key rate limits.
 */

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"

/* ─── Round-Robin Key Rotation ─── */

function getApiKeys(): string[] {
  const keys: string[] = []
  const k0 = process.env.ELEVENLABS_API_KEY
  const k1 = process.env.ELEVENLABS_API_KEY_1
  if (k0) keys.push(k0)
  if (k1) keys.push(k1)
  return keys
}

let _counter = 0

/**
 * Returns the next ElevenLabs API key using round-robin.
 * Throws if no keys are configured.
 */
export function getNextApiKey(): string {
  const keys = getApiKeys()
  if (keys.length === 0) {
    throw new Error("No ELEVENLABS_API_KEY configured")
  }
  const key = keys[_counter % keys.length]
  _counter++
  console.log(
    `[elevenlabs] Using API key #${((_counter - 1) % keys.length) + 1} of ${keys.length} (request #${_counter})`
  )
  return key
}

/* ─── Models ─── */

export interface ElevenLabsModel {
  id: string
  name: string
  description: string
}

export const TTS_MODELS: ElevenLabsModel[] = [
  {
    id: "eleven_v3",
    name: "Eleven v3",
    description: "Model terbaru — ekspresi emosi tinggi, natural, dan dramatis",
  },
  {
    id: "eleven_multilingual_v2",
    name: "Multilingual v2",
    description: "Stabil dan berkualitas tinggi, mendukung 29+ bahasa",
  },
  {
    id: "eleven_flash_v2_5",
    name: "Flash v2.5",
    description: "Ultra-low latency (~75ms), cocok untuk real-time",
  },
]

/* ─── Voice Interface ─── */

export interface ElevenLabsVoice {
  voice_id: string
  name: string
  category: string
  labels: Record<string, string>
  preview_url: string | null
  description: string | null
}

/* ─── API Functions ─── */

/**
 * List available voices from ElevenLabs.
 */
export async function listVoices(): Promise<ElevenLabsVoice[]> {
  const apiKey = getNextApiKey()

  const res = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { "xi-api-key": apiKey },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail?.message || `ElevenLabs voices error: ${res.status}`)
  }

  const data = await res.json()
  return (data.voices || []).map((v: Record<string, unknown>) => ({
    voice_id: v.voice_id,
    name: v.name,
    category: v.category || "premade",
    labels: v.labels || {},
    preview_url: v.preview_url || null,
    description: v.description || null,
  }))
}

/**
 * Generate speech from text using ElevenLabs TTS.
 * Returns raw audio ArrayBuffer (mp3).
 */
export async function ttsGenerate(params: {
  text: string
  voiceId: string
  modelId?: string
  stability?: number
  similarityBoost?: number
}): Promise<ArrayBuffer> {
  const apiKey = getNextApiKey()
  const { text, voiceId, modelId, stability, similarityBoost } = params

  const payload: Record<string, unknown> = {
    text,
    model_id: modelId || "eleven_multilingual_v2",
  }

  if (stability !== undefined || similarityBoost !== undefined) {
    payload.voice_settings = {
      stability: stability ?? 0.5,
      similarity_boost: similarityBoost ?? 0.75,
    }
  }

  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      err.detail?.message || err.detail || `ElevenLabs TTS error: ${res.status}`
    )
  }

  return res.arrayBuffer()
}

/**
 * Generate sound effects from text description.
 * Returns raw audio ArrayBuffer (mp3).
 */
export async function sfxGenerate(params: {
  text: string
  durationSeconds?: number
}): Promise<ArrayBuffer> {
  const apiKey = getNextApiKey()
  const { text, durationSeconds } = params

  const payload: Record<string, unknown> = { text }
  if (durationSeconds !== undefined) {
    payload.duration_seconds = durationSeconds
  }

  const res = await fetch(`${ELEVENLABS_BASE}/sound-generation`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      err.detail?.message || err.detail || `ElevenLabs SFX error: ${res.status}`
    )
  }

  return res.arrayBuffer()
}
