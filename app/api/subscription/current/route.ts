import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/subscription/current — Get user's current subscription status
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const sub = await prisma.subscriptions.findUnique({
      where: { userId: session.user.id },
      include: { subscription_plans: true },
    })

    if (!sub) {
      return NextResponse.json({ subscription: null })
    }

    // Check if expired
    const now = new Date()
    if (sub.status === "active" && now > sub.endDate) {
      await prisma.subscriptions.update({
        where: { userId: session.user.id },
        data: { status: "expired", updatedAt: now },
      })
      return NextResponse.json({
        subscription: {
          ...formatSub(sub),
          status: "expired",
          isActive: false,
          daysRemaining: 0,
        },
      })
    }

    const daysRemaining = sub.status === "active"
      ? Math.max(0, Math.ceil((sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    return NextResponse.json({
      subscription: {
        ...formatSub(sub),
        isActive: sub.status === "active",
        daysRemaining,
        features: sub.subscription_plans?.features || [],
      },
    })
  } catch (error) {
    console.error("[subscription/current] Error:", error)
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
  }
}

function formatSub(sub: {
  id: string
  plan: string
  status: string
  startDate: Date
  endDate: Date
  price: number
  planId: string | null
}) {
  return {
    id: sub.id,
    plan: sub.plan,
    status: sub.status,
    startDate: sub.startDate.toISOString(),
    endDate: sub.endDate.toISOString(),
    price: sub.price,
    planId: sub.planId,
  }
}
