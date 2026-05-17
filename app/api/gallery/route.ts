import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/gallery - Fetch current user's gallery items
 * Query params:
 *   type   — "all" | "image" | "video" (default: "all")
 *   cursor — last item id for pagination
 *   limit  — items per page (default 30, max 100)
 *   search — search prompt text
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const type = searchParams.get("type") || "all"
  const cursor = searchParams.get("cursor")
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 100)
  const search = searchParams.get("search")?.trim()

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: session.user.id }

    if (type !== "all") {
      where.type = type
    }

    if (search) {
      where.prompt = { contains: search, mode: "insensitive" }
    }

    const items = await prisma.gallery_items.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1, // fetch one extra to check hasMore
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
      select: {
        id: true,
        type: true,
        gcsUrl: true,
        mediaGenerationId: true,
        prompt: true,
        model: true,
        aspectRatio: true,
        width: true,
        height: true,
        sourceAction: true,
        createdAt: true,
      },
    })

    const hasMore = items.length > limit
    const result = hasMore ? items.slice(0, limit) : items
    const nextCursor = hasMore ? result[result.length - 1]?.id : null

    return NextResponse.json({
      items: result,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    console.error("Gallery fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch gallery" }, { status: 500 })
  }
}
