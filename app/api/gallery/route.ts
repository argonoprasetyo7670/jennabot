import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/gallery - Fetch current user's gallery items
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const items = await prisma.gallery_items.findMany({
      where: {
        userId: session.user.id,
        type: "image",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        gcsUrl: true,
        mediaGenerationId: true,
        prompt: true,
        model: true,
        aspectRatio: true,
        width: true,
        height: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error("Gallery fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch gallery" }, { status: 500 })
  }
}
