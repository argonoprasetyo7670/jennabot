import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/admin/gallery - Fetch all gallery items from all users
 * Query params:
 *   type   — "all" | "image" | "video" (default: "all")
 *   page   — page number (default 1)
 *   limit      — items per page (default 24, max 100)
 *   search     — search prompt text
 *   sort       — "desc" | "asc" (default: "desc")
 *   status     — "all" | "active" | "expired"
 *   userEmail  — filter by user email
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Double check admin role
  const me = await prisma.users.findUnique({ where: { id: session.user.id } })
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const type = searchParams.get("type") || "all"
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const limit = Math.min(Number(searchParams.get("limit")) || 24, 100)
  const search = searchParams.get("search")?.trim()
  const sort = searchParams.get("sort") === "asc" ? "asc" : "desc"
  const status = searchParams.get("status") || "all"
  const userEmail = searchParams.get("userEmail")?.trim()

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (type !== "all") {
      where.type = type
    }

    if (search) {
      where.prompt = { contains: search, mode: "insensitive" }
    }

    if (userEmail) {
      where.users = { email: { contains: userEmail, mode: "insensitive" } }
    }

    if (status === "active") {
      where.expiresAt = { gt: new Date() }
    } else if (status === "expired") {
      where.expiresAt = { lte: new Date() }
    }

    const total = await prisma.gallery_items.count({ where })

    const items = await prisma.gallery_items.findMany({
      where,
      orderBy: { createdAt: sort },
      skip: (page - 1) * limit,
      take: limit,
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
        users: {
          select: {
            name: true,
            email: true,
          }
        }
      },
    })

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Admin Gallery fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch gallery" }, { status: 500 })
  }
}
