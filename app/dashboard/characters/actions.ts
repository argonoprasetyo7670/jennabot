"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { deductCredits } from "@/lib/credits"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { s3Client, BUCKET_NAME } from "@/lib/s3"
import crypto from "crypto"

const USEAPI_BASE = "https://api.useapi.net/v1/google-flow"
const CAPTCHA_BROKER_URL = process.env.CAPTCHA_BROKER_URL || "http://localhost:4000"
const CAPTCHA_BROKER_KEY = process.env.CAPTCHA_BROKER_KEY || "sk-admin-change-me"
const MAX_CAPTCHA_RETRIES = 3
const CREDIT_COST = 3

const VALID_PRESETS = [
  "Achernar", "Achird", "Algenib", "Algieba", "Alnilam",
  "Aoede", "Autonoe", "Callirrhoe", "Charon", "Despina",
  "Enceladus", "Erinome", "Fenrir", "Gacrux", "Iapetus",
  "Kore", "Laomedeia", "Leda", "Orus", "Puck",
  "Pulcherrima", "Rasalgethi", "Sadachbia", "Sadaltager",
  "Schedar", "Sulafat", "Umbriel", "Vindemiatrix", "Zephyr",
  "Zubenelgenubi",
]

// ── Helper ──

async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

function requireToken() {
  const token = process.env.USEAPI_TOKEN
  if (!token) throw new Error("USEAPI_TOKEN not configured")
  return token
}

async function getCaptchaToken(): Promise<string | null> {
  try {
    const res = await fetch(`${CAPTCHA_BROKER_URL}/token?action=VOICE_CREATION`, {
      headers: { "X-API-Key": CAPTCHA_BROKER_KEY },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.token || null
  } catch {
    return null
  }
}

async function resolveEmail(apiToken: string): Promise<string> {
  try {
    const res = await fetch(`${USEAPI_BASE}/accounts`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    })
    if (!res.ok) throw new Error("Failed to fetch accounts")
    const data = await res.json()
    const emails = Array.isArray(data)
      ? data.map((a: { email?: string }) => a.email).filter(Boolean)
      : data.email ? [data.email] : []
    if (emails.length > 0) return emails[0] as string
  } catch (err) {
    console.warn("[resolveEmail] Failed:", err)
  }
  throw new Error("Email Google Flow diperlukan. Hubungi admin.")
}

/**
 * Upload image buffer to MinIO CDN and return permanent URL.
 */
async function uploadImageToCDN(
  buffer: Buffer,
  contentType: string,
  userId: string
): Promise<string> {
  const extMap: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
  }
  const ext = extMap[contentType] || ".png"
  const id = crypto.randomUUID()
  const key = `characters/${userId}/${id}${ext}`

  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))

  const endpoint = process.env.MINIO_ENDPOINT || "https://cdn.jennabot.pro"
  return `${endpoint.replace(/\/$/, "")}/${BUCKET_NAME}/${key}`
}

// ── List ──

export async function getCharactersAndVoices() {
  const userId = await requireAuth()

  const [characters, voices] = await Promise.all([
    prisma.user_characters.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        characterRefId: true,
        entityId: true,
        displayName: true,
        personalityNotes: true,
        imageRef1: true,
        imageRef2: true,
        imageUrl1: true,
        imageUrl2: true,
        voiceType: true,
        voiceValue: true,
        createdAt: true,
      },
    }),
    prisma.user_voices.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        voiceRefId: true,
        displayName: true,
        baseVoice: true,
        dialog: true,
        voicePerformance: true,
        audioUrl: true,
        createdAt: true,
      },
    }),
  ])

  return { characters, voices }
}

// ── Create Character ──
// POST /characters: ONLY accepts displayName, imageReference_1, imageReference_2, personalityNotes, voice.
// NO email, NO captchaToken.

export async function createCharacterAction(params: {
  displayName: string
  imageReference_1: string
  imageReference_2?: string
  personalityNotes?: string
  voice?: string
  imageData_1?: string  // base64 encoded image
  imageType_1?: string  // mime type
  imageData_2?: string
  imageType_2?: string
}) {
  const userId = await requireAuth()
  const apiToken = requireToken()
  const { displayName, imageReference_1, imageReference_2, personalityNotes, voice, imageData_1, imageType_1, imageData_2, imageType_2 } = params

  // Validate
  if (!displayName || displayName.length > 200) throw new Error("displayName wajib diisi (maks 200 karakter)")
  if (!imageReference_1) throw new Error("Minimal 1 reference image diperlukan")
  if (personalityNotes && personalityNotes.length > 2000) throw new Error("personalityNotes maks 2000 karakter")

  // Credit check
  const credits = await prisma.user_credits.findUnique({ where: { userId } })
  if ((credits?.balance ?? 0) < CREDIT_COST) {
    throw new Error(`Kredit tidak cukup. Butuh ${CREDIT_COST}, saldo: ${credits?.balance ?? 0}`)
  }

  // Build payload — ONLY accepted params
  const payload: Record<string, string> = {
    displayName: displayName.trim(),
    imageReference_1,
  }
  if (imageReference_2) payload.imageReference_2 = imageReference_2
  if (personalityNotes) payload.personalityNotes = personalityNotes.trim()
  if (voice) payload.voice = voice

  console.log(`[createCharacter] Payload:`, JSON.stringify(payload))

  const res = await fetch(`${USEAPI_BASE}/characters`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error(`[createCharacter] UseAPI ${res.status}:`, JSON.stringify(data))
    throw new Error(typeof data.error === "string" ? data.error : `UseAPI error: ${res.status}`)
  }

  if (!data.character) throw new Error("No character ID in response")

  // Deduct credits
  await deductCredits(userId, CREDIT_COST, "custom-character")

  // Determine voice type
  let voiceType: string | null = null
  let voiceValue: string | null = null
  if (voice) {
    voiceType = voice.startsWith("user:") ? "custom" : "system"
    voiceValue = voice
  }

  // Upload images to CDN for display
  let imageUrl1: string | null = null
  let imageUrl2: string | null = null

  try {
    if (imageData_1 && imageType_1) {
      const buf = Buffer.from(imageData_1, "base64")
      imageUrl1 = await uploadImageToCDN(buf, imageType_1, userId)
      console.log(`[createCharacter] Uploaded image 1 to CDN: ${imageUrl1}`)
    }
    if (imageData_2 && imageType_2) {
      const buf = Buffer.from(imageData_2, "base64")
      imageUrl2 = await uploadImageToCDN(buf, imageType_2, userId)
      console.log(`[createCharacter] Uploaded image 2 to CDN: ${imageUrl2}`)
    }
  } catch (cdnErr) {
    console.error("[createCharacter] CDN upload failed (non-fatal):", cdnErr)
  }

  // Save to DB
  const emailFromRef = (data.character as string).match(/-email:([^-]+)/)?.[1] || ""
  const record = await prisma.user_characters.create({
    data: {
      userId,
      characterRefId: data.character,
      entityId: data.entityId || "",
      displayName: data.displayName || displayName.trim(),
      personalityNotes: data.personalityNotes || personalityNotes?.trim() || null,
      imageRef1: imageReference_1,
      imageRef2: imageReference_2 || null,
      imageUrl1,
      imageUrl2,
      voiceType,
      voiceValue,
      email: emailFromRef,
    },
  })

  console.log(`[createCharacter] Created: ${record.characterRefId}`)

  // Auto-save character images to gallery_items so they appear in gallery picker
  const galleryPromises: Promise<unknown>[] = []
  const galleryBase = {
    userId,
    type: "image" as const,
    prompt: `Character: ${displayName.trim()}`,
    model: "character-reference",
    sourceAction: "character-create",
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  }
  if (imageUrl1) {
    galleryPromises.push(
      prisma.gallery_items.create({
        data: {
          id: crypto.randomUUID(),
          ...galleryBase,
          gcsPath: imageUrl1.split("/").slice(-3).join("/"),
          gcsUrl: imageUrl1,
          mediaGenerationId: imageReference_1,
        },
      })
    )
  }
  if (imageUrl2) {
    galleryPromises.push(
      prisma.gallery_items.create({
        data: {
          id: crypto.randomUUID(),
          ...galleryBase,
          gcsPath: imageUrl2.split("/").slice(-3).join("/"),
          gcsUrl: imageUrl2,
          mediaGenerationId: imageReference_2 || null,
        },
      })
    )
  }
  if (galleryPromises.length > 0) {
    await Promise.allSettled(galleryPromises)
    console.log(`[createCharacter] Saved ${galleryPromises.length} image(s) to gallery`)
  }

  return { id: record.id, characterRefId: record.characterRefId }
}

// ── Create Voice ──
// POST /voices: requires email, captchaToken. Captcha retry enabled.

export async function createVoiceAction(params: {
  voice: string
  displayName: string
  dialog: string
  voicePerformance: string
}) {
  const userId = await requireAuth()
  const apiToken = requireToken()
  const { voice, displayName, dialog, voicePerformance } = params

  // Validate
  if (!voice || !VALID_PRESETS.includes(voice)) throw new Error("Voice preset tidak valid")
  if (!displayName || displayName.length > 200) throw new Error("displayName wajib (maks 200)")
  if (!dialog || dialog.length > 120) throw new Error("dialog wajib (maks 120)")
  if (!voicePerformance || voicePerformance.length > 120) throw new Error("voicePerformance wajib (maks 120)")

  // Credit check
  const credits = await prisma.user_credits.findUnique({ where: { userId } })
  if ((credits?.balance ?? 0) < CREDIT_COST) {
    throw new Error(`Kredit tidak cukup. Butuh ${CREDIT_COST}, saldo: ${credits?.balance ?? 0}`)
  }

  // Resolve email (required by POST /voices)
  const email = await resolveEmail(apiToken)

  const basePayload = {
    email,
    voice,
    dialog: dialog.trim(),
    voicePerformance: voicePerformance.trim(),
    displayName: displayName.trim(),
  }

  let data: Record<string, unknown> | null = null

  for (let attempt = 1; attempt <= MAX_CAPTCHA_RETRIES; attempt++) {
    const captchaToken = await getCaptchaToken()
    const payload: Record<string, unknown> = { ...basePayload }
    if (captchaToken) payload.captchaToken = captchaToken

    console.log(`[createVoice] Attempt ${attempt}/${MAX_CAPTCHA_RETRIES} (captcha: ${captchaToken ? "yes" : "no"})`)

    const res = await fetch(`${USEAPI_BASE}/voices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const resData = await res.json()

    if (res.status === 403 && attempt < MAX_CAPTCHA_RETRIES) {
      console.warn("[createVoice] 403 captcha rejected, retrying...")
      continue
    }

    if (!res.ok) {
      throw new Error(resData.error || `UseAPI error: ${res.status}`)
    }

    data = resData
    break
  }

  if (!data || !data.voice) throw new Error("Failed to create voice")

  // Deduct credits
  await deductCredits(userId, CREDIT_COST, "custom-voice")

  // Save to DB
  const record = await prisma.user_voices.create({
    data: {
      userId,
      voiceRefId: data.voice as string,
      displayName: (data.displayName as string) || displayName.trim(),
      baseVoice: (data.baseVoice as string) || voice,
      dialog: (data.dialog as string) || dialog.trim(),
      voicePerformance: (data.voicePerformance as string) || voicePerformance.trim(),
      audioUrl: (data.audioUrl as string) || null,
      workflowId: (data.workflowId as string) || null,
      mediaId: (data.mediaId as string) || null,
      email: email || "",
    },
  })

  console.log(`[createVoice] Created: ${record.voiceRefId}`)
  return { id: record.id, voiceRefId: record.voiceRefId }
}

// ── Delete Character ──

export async function deleteCharacterAction(characterRefId: string) {
  const userId = await requireAuth()
  const apiToken = requireToken()

  const character = await prisma.user_characters.findFirst({
    where: { characterRefId, userId },
  })
  if (!character) throw new Error("Character tidak ditemukan")

  // Delete from UseAPI (best-effort)
  try {
    await fetch(
      `${USEAPI_BASE}/characters/ref?character=${encodeURIComponent(characterRefId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${apiToken}` } }
    )
  } catch (err) {
    console.warn("[deleteCharacter] UseAPI delete failed:", err)
  }

  await prisma.user_characters.delete({ where: { id: character.id } })
  console.log(`[deleteCharacter] Deleted: ${characterRefId}`)
}

// ── Delete Voice ──

export async function deleteVoiceAction(voiceRefId: string) {
  const userId = await requireAuth()
  const apiToken = requireToken()

  const voice = await prisma.user_voices.findFirst({
    where: { voiceRefId, userId },
  })
  if (!voice) throw new Error("Voice tidak ditemukan")

  // Delete from UseAPI (best-effort)
  try {
    await fetch(
      `${USEAPI_BASE}/voices/ref?voice=${encodeURIComponent(voiceRefId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${apiToken}` } }
    )
  } catch (err) {
    console.warn("[deleteVoice] UseAPI delete failed:", err)
  }

  await prisma.user_voices.delete({ where: { id: voice.id } })
  console.log(`[deleteVoice] Deleted: ${voiceRefId}`)
}
