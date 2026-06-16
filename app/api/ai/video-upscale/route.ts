import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { deductCredits, refundCredits } from "@/lib/credit-guard"

const USEAPI_BASE = "https://api.useapi.net/v1/google-flow"
const CREDIT_COST_4K = 50

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
    const { mediaGenerationId, resolution } = body

    if (!mediaGenerationId) {
      return NextResponse.json({ error: "mediaGenerationId is required" }, { status: 400 })
    }

    const is4K = resolution === "4K"
    const requiredCredits = is4K ? CREDIT_COST_4K : 0

    if (requiredCredits > 0) {
      const credits = await prisma.user_credits.findUnique({ where: { userId: session.user.id } })
      const currentBalance = credits?.balance ?? 0

      // Deduct credits beforehand
      const deductResult = await deductCredits(
        session.user.id,
        requiredCredits,
        "video-upscale",
        `Upscale video ke ${resolution}`
      )

      if (!deductResult.ok) {
        return NextResponse.json(
          { error: `Kredit tidak cukup. Butuh ${requiredCredits}, saldo: ${deductResult.balance}` },
          { status: 402 }
        )
      }
    }

    const payload = {
      mediaGenerationId,
      resolution: is4K ? "4K" : "1080p",
      async: false // fire and forget false (Wait for completion)
    }

    const response = await fetch(`${USEAPI_BASE}/videos/upscale`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      // Refund credits on failure
      if (requiredCredits > 0) {
        await refundCredits(session.user.id, requiredCredits, "video-upscale")
      }
      return NextResponse.json({ error: data.error || `API error: ${response.status}` }, { status: response.status })
    }

    // Extract videoUrl
    let videoUrl = ""
    let thumbnailUrl = ""
    let newMediaGenerationId = mediaGenerationId
    
    if (data.media && data.media[0]) {
      videoUrl = data.media[0].videoUrl || ""
      thumbnailUrl = data.media[0].thumbnailUrl || ""
      newMediaGenerationId = data.media[0].mediaGenerationId || newMediaGenerationId
    } else if (data.operations && data.operations[0]) {
      const op = data.operations[0].operation
      const video = op?.metadata?.video
      videoUrl = video?.fifeUrl || ""
      thumbnailUrl = video?.servingBaseUri || ""
      newMediaGenerationId = video?.mediaGenerationId || newMediaGenerationId
    }

    if (!videoUrl) {
      if (requiredCredits > 0) {
        await refundCredits(session.user.id, requiredCredits, "video-upscale")
      }
      return NextResponse.json({ error: "Video URL not found in upscale response" }, { status: 500 })
    }

    return NextResponse.json({ 
      videoUrl, 
      thumbnailUrl, 
      mediaGenerationId: newMediaGenerationId, 
      creditsDeducted: requiredCredits 
    })

  } catch (error) {
    console.error("Video upscale error:", error)
    return NextResponse.json({ error: "Failed to upscale video" }, { status: 500 })
  }
}

export const maxDuration = 300
