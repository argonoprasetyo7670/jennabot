import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const MAGNIFIC_BASE = "https://api.magnific.com/v1/ai/video"
const MOTION_CONTROL_CREDIT_COST = 120

type MotionTier = "pro" | "std"
type MotionOrientation = "video" | "image"

interface MagnificTaskData {
  task_id?: string
  id?: string
  status?: string
  generated?: string[]
  output?: string[]
  result?: string[] | { generated?: string[]; video_url?: string; url?: string }
  video_url?: string
  url?: string
}

function endpointForTier(tier: MotionTier) {
  return `${MAGNIFIC_BASE}/kling-v3-motion-control-${tier === "pro" ? "pro" : "std"}`
}

function isValidUrl(value: unknown) {
  if (typeof value !== "string") return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

function normalizeTier(value: unknown): MotionTier {
  return value === "std" ? "std" : "pro"
}

function normalizeOrientation(value: unknown): MotionOrientation {
  return value === "image" ? "image" : "video"
}

function extractTask(raw: unknown) {
  const response = raw as Record<string, unknown>
  const data = (response.data ?? response) as MagnificTaskData
  const nestedResult = data.result && !Array.isArray(data.result) ? data.result : undefined
  const generated = [
    ...(Array.isArray(data.generated) ? data.generated : []),
    ...(Array.isArray(data.output) ? data.output : []),
    ...(Array.isArray(data.result) ? data.result : []),
    ...(Array.isArray(nestedResult?.generated) ? nestedResult.generated : []),
    ...(typeof data.video_url === "string" ? [data.video_url] : []),
    ...(typeof data.url === "string" ? [data.url] : []),
    ...(typeof nestedResult?.video_url === "string" ? [nestedResult.video_url] : []),
    ...(typeof nestedResult?.url === "string" ? [nestedResult.url] : []),
  ].filter((url): url is string => typeof url === "string" && url.length > 0)

  return {
    taskId: data.task_id ?? data.id ?? (response.task_id as string | undefined) ?? (response.id as string | undefined),
    status: data.status ?? (response.status as string | undefined) ?? "CREATED",
    generated: [...new Set(generated)],
    raw,
  }
}

async function deductCredits(userId: string) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.user_credits.updateMany({
      where: {
        userId,
        balance: { gte: MOTION_CONTROL_CREDIT_COST },
      },
      data: {
        balance: { decrement: MOTION_CONTROL_CREDIT_COST },
        updatedAt: new Date(),
      },
    })

    if (updated.count === 0) {
      const credits = await tx.user_credits.findUnique({ where: { userId } })
      return {
        ok: false as const,
        balance: credits?.balance ?? 0,
      }
    }

    const credits = await tx.user_credits.findUnique({ where: { userId } })
    const balance = credits?.balance ?? 0

    await tx.credit_transactions.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: "deduct",
        amount: -MOTION_CONTROL_CREDIT_COST,
        balance,
        description: "Kling v3 Motion Control",
        feature: "motion-control",
      },
    })

    return { ok: true as const, balance }
  })
}

async function refundCredits(userId: string) {
  const credits = await prisma.user_credits.upsert({
    where: { userId },
    update: {
      balance: { increment: MOTION_CONTROL_CREDIT_COST },
      updatedAt: new Date(),
    },
    create: {
      id: crypto.randomUUID(),
      userId,
      balance: MOTION_CONTROL_CREDIT_COST,
      updatedAt: new Date(),
    },
  })

  await prisma.credit_transactions.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      type: "refund",
      amount: MOTION_CONTROL_CREDIT_COST,
      balance: credits.balance,
      description: "Refund Kling v3 Motion Control",
      feature: "motion-control",
    },
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let creditsDeducted = false

  try {
    const body = await req.json()
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : ""
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : ""
    const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl.trim() : ""
    const webhookUrl = typeof body.webhookUrl === "string" ? body.webhookUrl.trim() : ""
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : ""
    const tier = normalizeTier(body.tier)
    const characterOrientation = normalizeOrientation(body.characterOrientation)
    const cfgScale = Number(body.cfgScale ?? 0.5)

    if (!apiKey) {
      return NextResponse.json({ error: "API key Magnific wajib diisi" }, { status: 400 })
    }
    if (!isValidUrl(imageUrl)) {
      return NextResponse.json({ error: "URL gambar karakter tidak valid" }, { status: 400 })
    }
    if (!isValidUrl(videoUrl)) {
      return NextResponse.json({ error: "URL video referensi tidak valid" }, { status: 400 })
    }
    if (webhookUrl && !isValidUrl(webhookUrl)) {
      return NextResponse.json({ error: "Webhook URL tidak valid" }, { status: 400 })
    }
    if (prompt.length > 2500) {
      return NextResponse.json({ error: "Prompt maksimal 2500 karakter" }, { status: 400 })
    }
    if (!Number.isFinite(cfgScale) || cfgScale < 0 || cfgScale > 1) {
      return NextResponse.json({ error: "CFG scale harus di antara 0 dan 1" }, { status: 400 })
    }

    const creditResult = await deductCredits(session.user.id)
    if (!creditResult.ok) {
      return NextResponse.json(
        {
          error: `Kredit tidak cukup. Butuh ${MOTION_CONTROL_CREDIT_COST}, saldo: ${creditResult.balance}`,
          balance: creditResult.balance,
          required: MOTION_CONTROL_CREDIT_COST,
        },
        { status: 402 }
      )
    }
    creditsDeducted = true

    const payload: Record<string, unknown> = {
      image_url: imageUrl,
      video_url: videoUrl,
      character_orientation: characterOrientation,
      cfg_scale: cfgScale,
    }
    if (prompt) payload.prompt = prompt
    if (webhookUrl) payload.webhook_url = webhookUrl

    const response = await fetch(endpointForTier(tier), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-magnific-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      await refundCredits(session.user.id)
      creditsDeducted = false
      const message =
        (data as Record<string, string>).error ||
        (data as Record<string, string>).message ||
        `Magnific API error: ${response.status}`
      return NextResponse.json({ error: message }, { status: response.status })
    }

    return NextResponse.json({
      ...extractTask(data),
      tier,
      creditsDeducted: MOTION_CONTROL_CREDIT_COST,
      balance: creditResult.balance,
    })
  } catch (error) {
    if (creditsDeducted) {
      await refundCredits(session.user.id).catch((refundError) => {
        console.error("[motion-control] Refund error:", refundError)
      })
    }
    console.error("[motion-control] Create error:", error)
    return NextResponse.json({ error: "Gagal membuat task Motion Control" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = req.headers.get("x-magnific-api-key")?.trim() || ""
  const taskId = req.nextUrl.searchParams.get("taskId")?.trim() || ""
  const tier = normalizeTier(req.nextUrl.searchParams.get("tier"))

  if (!apiKey) {
    return NextResponse.json({ error: "API key Magnific wajib diisi" }, { status: 400 })
  }
  if (!taskId) {
    return NextResponse.json({ error: "taskId wajib diisi" }, { status: 400 })
  }

  try {
    const response = await fetch(`${endpointForTier(tier)}/${encodeURIComponent(taskId)}`, {
      headers: {
        "x-magnific-api-key": apiKey,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message =
        (data as Record<string, string>).error ||
        (data as Record<string, string>).message ||
        `Magnific API error: ${response.status}`
      return NextResponse.json({ error: message }, { status: response.status })
    }

    return NextResponse.json({
      ...extractTask(data),
      tier,
    })
  } catch (error) {
    console.error("[motion-control] Status error:", error)
    return NextResponse.json({ error: "Gagal mengecek status Motion Control" }, { status: 500 })
  }
}

export const maxDuration = 60
