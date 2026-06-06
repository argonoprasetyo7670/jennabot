import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const USEAPI_BASE = "https://api.useapi.net/v1/runwayml"

/** Credit cost per Runway video generation */
const CREDIT_COST_RUNWAY = 120

/**
 * Track which tasks have already been credit-deducted (prevents double deduction on re-poll).
 * Cleaned up after 30 minutes.
 */
const deductedTasks = new Map<string, number>()

setInterval(() => {
  const cutoff = Date.now() - 30 * 60_000
  for (const [id, ts] of deductedTasks) {
    if (ts < cutoff) deductedTasks.delete(id)
  }
}, 5 * 60_000)

/**
 * Map HTTP status codes & raw error text to user-friendly Indonesian messages.
 */
function friendlyGenerateError(status: number, rawError: string): string {
  const lower = rawError.toLowerCase()

  if (status === 402 || lower.includes("insufficient") || lower.includes("credit"))
    return "Kredit tidak cukup untuk membuat video."
  if (status === 413 || lower.includes("too large") || lower.includes("entity too large"))
    return "File referensi terlalu besar. Coba gunakan file yang lebih kecil."
  if (status === 429 || lower.includes("rate limit") || lower.includes("too many") || lower.includes("throttl"))
    return "Server sedang sibuk. Tunggu beberapa saat lalu coba lagi."
  if (status === 401 || status === 403)
    return "Sesi login habis. Silakan refresh halaman dan login ulang."
  if (status === 400 || lower.includes("invalid") || lower.includes("bad request"))
    return "Parameter tidak valid. Pastikan prompt dan referensi sudah benar."
  if (status === 503 || status === 502 || lower.includes("unavailable") || lower.includes("maintenance"))
    return "Layanan video generation sedang maintenance. Coba lagi nanti."
  if (lower.includes("timeout") || lower.includes("timed out"))
    return "Proses timeout. Pastikan koneksi internet stabil dan coba lagi."
  if (lower.includes("content policy") || lower.includes("moderation") || lower.includes("safety"))
    return "Konten tidak diizinkan oleh kebijakan keamanan AI. Coba prompt yang berbeda."
  if (lower.includes("quota") || lower.includes("limit reached"))
    return "Batas penggunaan harian tercapai. Coba lagi besok."
  if (status >= 500)
    return "Terjadi kesalahan pada server. Coba lagi dalam beberapa saat."

  return "Gagal membuat video. Silakan coba lagi."
}

function friendlyPollError(status: number, rawError: string): string {
  const lower = rawError.toLowerCase()

  if (lower.includes("content policy") || lower.includes("moderation") || lower.includes("safety"))
    return "Video ditolak oleh kebijakan keamanan AI. Coba prompt yang berbeda."
  if (lower.includes("failed") || lower.includes("error"))
    return "Pembuatan video gagal. Silakan coba lagi dengan prompt atau referensi yang berbeda."
  if (status === 429 || lower.includes("throttl"))
    return "Server sedang sibuk. Video masih diproses, silakan tunggu."
  if (status >= 500)
    return "Terjadi gangguan sementara. Coba lagi dalam beberapa saat."

  return "Pembuatan video gagal. Silakan coba lagi."
}

/**
 * Deduct credits for a user.
 */
async function deductCredits(userId: string, amount: number, feature: string): Promise<number> {
  try {
    const credits = await prisma.user_credits.findUnique({ where: { userId } })
    const currentBalance = credits?.balance ?? 0
    const newBalance = Math.max(0, currentBalance - amount)

    await prisma.$transaction([
      prisma.user_credits.upsert({
        where: { userId },
        update: { balance: newBalance, updatedAt: new Date() },
        create: { id: crypto.randomUUID(), userId, balance: newBalance, updatedAt: new Date() },
      }),
      prisma.credit_transactions.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          type: "deduct",
          amount: -amount,
          balance: newBalance,
          description: `Runway video generation (${feature})`,
          feature,
        },
      }),
    ])

    console.log(`[runway/video-generate] Credits deducted: ${amount} for user ${userId}. Balance: ${currentBalance} → ${newBalance}`)
    return amount
  } catch (err) {
    console.error(`[runway/video-generate] Failed to deduct credits for user ${userId}:`, err)
    return 0
  }
}

/**
 * Safely parse a fetch response — returns parsed JSON or null + logs raw text.
 */
async function safeParseResponse(response: Response, context: string): Promise<Record<string, unknown> | null> {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    console.error(`[runway/${context}] Non-JSON response (${response.status}):`, text.slice(0, 300))
    return null
  }
}

/**
 * POST /api/runway/video-generate
 * Start a Runway video generation via POST /videos/create.
 * Returns taskId immediately — client polls GET for results.
 */
export async function POST(req: NextRequest) {
  const apiToken = process.env.USEAPI_TOKEN
  if (!apiToken) {
    return NextResponse.json({ error: "Layanan tidak tersedia saat ini." }, { status: 500 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      model, text_prompt, duration, aspect_ratio, resolution, audio,
      email, imageAssetIds, videoAssetId, videoAssetId2, videoAssetId3,
      startFrameAssetId, endFrameAssetId, characterOrientation,
      feature, asyncMode,
    } = body

    if (!model) {
      return NextResponse.json({ error: "Model video belum dipilih." }, { status: 400 })
    }

    // Check credit balance with retry (handles serverless DB cold start SocketTimeout P1008)
    let credits
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        credits = await prisma.user_credits.findUnique({ where: { userId: session.user.id } })
        break
      } catch (err: any) {
        if (err.code === "P1008" && attempt < 3) {
          console.warn(`[runway/video-generate] DB timeout, retrying... (${attempt}/3)`)
          await new Promise((resolve) => setTimeout(resolve, 2000))
        } else {
          throw err
        }
      }
    }
    const currentBalance = credits?.balance ?? 0

    if (currentBalance < CREDIT_COST_RUNWAY) {
      return NextResponse.json(
        { error: `Kredit tidak cukup. Dibutuhkan ${CREDIT_COST_RUNWAY} kredit, saldo Anda: ${currentBalance}.` },
        { status: 402 }
      )
    }

    // Build payload for UseAPI Runway /videos/create
    const payload: Record<string, unknown> = {
      model,
      exploreMode: true, // Always use explore mode
    }

    if (text_prompt) payload.text_prompt = text_prompt
    if (duration !== undefined) payload.duration = duration
    if (aspect_ratio) payload.aspect_ratio = aspect_ratio
    if (resolution) payload.resolution = resolution
    if (audio !== undefined) payload.audio = audio
    if (email) payload.email = email
    if (characterOrientation) payload.characterOrientation = characterOrientation

    // Keyframe assets (Seedance 2.0)
    if (startFrameAssetId) payload.startFrameAssetId = startFrameAssetId
    if (endFrameAssetId) payload.endFrameAssetId = endFrameAssetId

    // Image reference assets (imageAssetId1...imageAssetId11)
    if (imageAssetIds && Array.isArray(imageAssetIds)) {
      imageAssetIds.forEach((assetId: string, i: number) => {
        payload[`imageAssetId${i + 1}`] = assetId
      })
    }

    // Video reference assets
    if (videoAssetId) payload.videoAssetId = videoAssetId
    if (videoAssetId2) payload.videoAssetId2 = videoAssetId2
    if (videoAssetId3) payload.videoAssetId3 = videoAssetId3

    if (asyncMode) {
      const baseUrl = process.env.NEXTAUTH_URL || "https://jennabot.pro"
      const secret = process.env.NEXTAUTH_SECRET || "fallback-secret"
      payload.replyUrl = `${baseUrl}/api/runway/video-callback?secret=${encodeURIComponent(secret.slice(0, 8))}`

      const metaInfo = {
        userId: session.user.id,
        prompt: text_prompt || null,
        model: model,
        aspectRatio: aspect_ratio || null,
        feature: feature || "runway-video"
      }
      payload.replyRef = JSON.stringify(metaInfo)
    }

    console.log(`[runway/video-generate] Starting generation: model=${model}, async=${!!asyncMode}`)

    const response = await fetch(`${USEAPI_BASE}/videos/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await safeParseResponse(response, "video-generate-post")

    if (!data) {
      return NextResponse.json(
        { error: friendlyGenerateError(response.status, "non-json") },
        { status: response.status || 500 }
      )
    }

    if (!response.ok) {
      const rawError = (data.error as string) || JSON.stringify(data)
      console.error(`[runway/video-generate] Error ${response.status}:`, rawError)
      return NextResponse.json(
        { error: friendlyGenerateError(response.status, rawError) },
        { status: response.status }
      )
    }

    // Runway returns task with taskId
    const taskId = (data.task as Record<string, unknown> | undefined)?.taskId || data.taskId
    if (!taskId) {
      console.error("[runway/video-generate] No taskId in response:", data)
      return NextResponse.json({ error: `Gagal memulai (No taskId). Response: ${JSON.stringify(data)}` }, { status: 500 })
    }

    console.log(`[runway/video-generate] Task started: ${taskId}`)

    return NextResponse.json({
      taskId,
      status: "processing",
    })
  } catch (error: any) {
    console.error("[runway/video-generate] Error:", error)
    return NextResponse.json({ error: `Gagal memulai: ${error?.message || error}` }, { status: 500 })
  }
}

/**
 * GET /api/runway/video-generate?taskId=xxx
 * Poll Runway task status via GET /tasks/{taskId}.
 * When task is SUCCEEDED, deducts credits and returns artifacts.
 */
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId")

  if (!taskId) {
    return NextResponse.json({ error: "Parameter tidak lengkap." }, { status: 400 })
  }

  const apiToken = process.env.USEAPI_TOKEN
  if (!apiToken) {
    return NextResponse.json({ error: "Layanan tidak tersedia saat ini." }, { status: 500 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 })
  }

  try {
    // Fetch task status from UseAPI Runway
    const res = await fetch(`${USEAPI_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    })

    const data = await safeParseResponse(res, "video-generate-poll")

    if (!data) {
      // Non-JSON response — if 404, task may still be queued
      if (res.status === 404 || res.status < 500) {
        return NextResponse.json({ taskId, status: "processing" })
      }
      return NextResponse.json(
        { taskId, status: "error", error: "Terjadi gangguan sementara. Coba lagi." },
        { status: 500 }
      )
    }

    if (!res.ok) {
      console.error(`[runway/video-generate] Poll error ${res.status} for ${taskId}:`, data)

      if (res.status === 404) {
        return NextResponse.json({ taskId, status: "processing" })
      }

      return NextResponse.json(
        { taskId, status: "error", error: friendlyPollError(res.status, (data.error as string) || "") },
        { status: 500 }
      )
    }

    const taskStatus = data.status as string

    // Still processing
    if (taskStatus === "PENDING" || taskStatus === "RUNNING" || taskStatus === "THROTTLED") {
      const progressRatio = data.progressRatio as string | undefined
      return NextResponse.json({
        taskId,
        status: "processing",
        progressRatio: progressRatio ? parseFloat(progressRatio) : undefined,
        progressText: data.progressText as string | undefined,
      })
    }

    // Failed
    if (taskStatus === "FAILED" || taskStatus === "CANCELLED") {
      const rawError = (data.error as string) || ""
      console.error(`[runway/video-generate] Task ${taskId} failed:`, rawError)
      return NextResponse.json(
        { taskId, status: "error", error: friendlyPollError(500, rawError) },
        { status: 500 }
      )
    }

    // Succeeded — extract artifacts and deduct credits
    if (taskStatus === "SUCCEEDED") {
      const artifacts = (data.artifacts as Record<string, unknown>[]) || []
      const videos = artifacts
        .filter((a) => {
          const meta = a.metadata as Record<string, unknown> | undefined
          return meta?.duration !== undefined || (a.url as string)?.includes("video")
        })
        .map((a) => ({
          url: a.url as string,
          assetId: a.assetId as string,
          previewUrls: a.previewUrls as string[] | undefined,
          metadata: a.metadata as Record<string, unknown> | undefined,
        }))

      // If no videos found in artifacts, try all artifacts
      const results = videos.length > 0 ? videos : artifacts.map((a) => ({
        url: a.url as string,
        assetId: a.assetId as string,
        previewUrls: a.previewUrls as string[] | undefined,
        metadata: a.metadata as Record<string, unknown> | undefined,
      }))

      // Deduct credits (only once per task)
      let creditsDeducted = 0
      const deductKey = `deducted:${taskId}`
      if (!deductedTasks.has(deductKey)) {
        const feat = (data.taskType as string) || "runway-video"
        creditsDeducted = await deductCredits(session.user.id, CREDIT_COST_RUNWAY, `runway-${feat}`)
        deductedTasks.set(deductKey, Date.now())
      }

      console.log(`[runway/video-generate] Task ${taskId} succeeded. artifacts=${results.length}`)

      return NextResponse.json({
        taskId,
        status: "done",
        artifacts: results,
        creditsDeducted,
      })
    }

    // Unknown status — treat as still processing
    return NextResponse.json({ taskId, status: "processing" })
  } catch (error) {
    console.error(`[runway/video-generate] Poll error for ${taskId}:`, error)
    return NextResponse.json(
      { taskId, status: "error", error: "Terjadi gangguan koneksi. Coba lagi." },
      { status: 500 }
    )
  }
}

export const maxDuration = 300
