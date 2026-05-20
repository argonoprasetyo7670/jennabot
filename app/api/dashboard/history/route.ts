import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/dashboard/history — Get user's credit transaction history + generation history
 * Query params:
 *   tab    — "credits" | "generations" (default: "credits")
 *   cursor — last item id for pagination
 *   limit  — items per page (default 20, max 50)
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const tab = searchParams.get("tab") || "credits"
  const cursor = searchParams.get("cursor")
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50)

  try {
    if (tab === "credits") {
      const items = await prisma.credit_transactions.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: {
          id: true,
          type: true,
          amount: true,
          balance: true,
          description: true,
          feature: true,
          createdAt: true,
        },
      })

      const hasMore = items.length > limit
      const result = hasMore ? items.slice(0, limit) : items
      const nextCursor = hasMore ? result[result.length - 1]?.id : null

      return NextResponse.json({ items: result, nextCursor, hasMore })
    }

    if (tab === "generations") {
      const items = await prisma.gallery_items.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: {
          id: true,
          type: true,
          gcsUrl: true,
          prompt: true,
          model: true,
          aspectRatio: true,
          sourceAction: true,
          createdAt: true,
        },
      })

      const hasMore = items.length > limit
      const result = hasMore ? items.slice(0, limit) : items
      const nextCursor = hasMore ? result[result.length - 1]?.id : null

      return NextResponse.json({ items: result, nextCursor, hasMore })
    }

    if (tab === "payments") {
      const items = await prisma.transactions.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: {
          id: true,
          orderId: true,
          plan: true,
          amount: true,
          status: true,
          paymentType: true,
          createdAt: true,
        },
      })

      const hasMore = items.length > limit
      const result = hasMore ? items.slice(0, limit) : items
      const nextCursor = hasMore ? result[result.length - 1]?.id : null

      return NextResponse.json({ items: result, nextCursor, hasMore })
    }

    return NextResponse.json({ error: "Invalid tab parameter" }, { status: 400 })
  } catch (error) {
    console.error("Dashboard history error:", error)
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}
