import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

/**
 * POST /api/gallery/save — Save an image or video to the user's gallery
 * Body: { url, type, prompt, model, aspectRatio, mediaGenerationId }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { url, type, prompt, model, aspectRatio, mediaGenerationId, sourceAction } = await req.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Check if already saved (by URL)
    const existing = await prisma.gallery_items.findFirst({
      where: { userId: session.user.id, gcsUrl: url },
    })

    if (existing) {
      return NextResponse.json({ item: existing, alreadySaved: true })
    }

    const id = crypto.randomUUID()
    const gcsPath = `gallery/${session.user.id}/${id}`

    const item = await prisma.gallery_items.create({
      data: {
        id,
        userId: session.user.id,
        type: type || "image",
        gcsPath,
        gcsUrl: url,
        prompt: prompt || null,
        model: model || null,
        aspectRatio: aspectRatio || null,
        mediaGenerationId: mediaGenerationId || null,
        sourceAction: sourceAction || "generate",
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ item, alreadySaved: false })
  } catch (error) {
    console.error("Gallery save error:", error)
    return NextResponse.json({ error: "Failed to save to gallery" }, { status: 500 })
  }
}
