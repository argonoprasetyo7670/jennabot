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
 * POST /api/runway/video-generate
 * Start a Runway video generation via POST /videos/create.
 * Returns taskId immediately — client polls GET for results.
 *
 * Supported models: seedance-2, kling-3.0-motion-control
 */
export async function POST(req: NextRequest) {
  const apiToken = process.env.USEAPI_TOKEN
  if (!apiToken) {
    return NextResponse.json({ error: "USEAPI_TOKEN not configured" }, { status: 500 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      model, text_prompt, duration, aspect_ratio, resolution, audio,
      email, imageAssetIds, videoAssetId, videoAssetId2, videoAssetId3,
      startFrameAssetId, endFrameAssetId, characterOrientation,
      feature,
    } = body

    if (!model) {
      return NextResponse.json({ error: "model is required" }, { status: 400 })
    }

    // Check credit balance
    const credits = await prisma.user_credits.findUnique({ where: { userId: session.user.id } })
    const currentBalance = credits?.balance ?? 0

    if (currentBalance < CREDIT_COST_RUNWAY) {
      return NextResponse.json(
        { error: `Kredit tidak cukup. Butuh ${CREDIT_COST_RUNWAY}, saldo: ${currentBalance}` },
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

    console.log(`[runway/video-generate] Starting generation: model=${model}`)

    const response = await fetch(`${USEAPI_BASE}/videos/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(`[runway/video-generate] Error ${response.status}:`, JSON.stringify(data))
      return NextResponse.json(
        { error: data.error || `API error: ${response.status}` },
        { status: response.status }
      )
    }

    // Runway returns task with taskId
    const taskId = data.task?.taskId || data.taskId
    if (!taskId) {
      console.error("[runway/video-generate] No taskId in response:", data)
      return NextResponse.json({ error: "No taskId returned from Runway" }, { status: 500 })
    }

    console.log(`[runway/video-generate] Task started: ${taskId}`)

    return NextResponse.json({
      taskId,
      status: "processing",
    })
  } catch (error) {
    console.error("[runway/video-generate] Error:", error)
    return NextResponse.json({ error: "Failed to start video generation" }, { status: 500 })
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
    return NextResponse.json({ error: "taskId parameter is required" }, { status: 400 })
  }

  const apiToken = process.env.USEAPI_TOKEN
  if (!apiToken) {
    return NextResponse.json({ error: "USEAPI_TOKEN not configured" }, { status: 500 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Fetch task status from UseAPI Runway
    const res = await fetch(`${USEAPI_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.error(`[runway/video-generate] Poll error ${res.status} for ${taskId}:`, errData)

      if (res.status === 404) {
        return NextResponse.json({ taskId, status: "processing" })
      }

      return NextResponse.json(
        { taskId, status: "error", error: (errData as Record<string, string>).error || `Poll failed: ${res.status}` },
        { status: 500 }
      )
    }

    const data = await res.json() as Record<string, unknown>
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
      return NextResponse.json(
        { taskId, status: "error", error: (data.error as string) || "Runway generation failed" },
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

      // If no videos found in artifacts, try all artifacts (some may be images from frames endpoint)
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
      { taskId, status: "error", error: "Failed to check task status" },
      { status: 500 }
    )
  }
}

export const maxDuration = 300
