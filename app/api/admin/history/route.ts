import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

async function verifyAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (user?.role !== "admin") return null
  return session.user.id
}

/**
 * GET /api/admin/history — Fetch credit transactions or payment transactions
 * Query: ?type=credit|payment&page=1&limit=20&userId=xxx&feature=xxx
 */
export async function GET(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = req.nextUrl
  const type = url.searchParams.get("type") || "credit" // "credit" or "payment"
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))
  const userId = url.searchParams.get("userId") || ""
  const feature = url.searchParams.get("feature") || ""
  const status = url.searchParams.get("status") || ""

  if (type === "payment") {
    // Payment transactions (Midtrans)
    const where: Record<string, unknown> = {}
    if (userId) where.userId = userId
    if (status) where.status = status

    const [transactions, total] = await Promise.all([
      prisma.transactions.findMany({
        where,
        include: {
          users: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transactions.count({ where }),
    ])

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        orderId: t.orderId,
        userName: t.users?.name || "Unknown",
        userEmail: t.users?.email || "Unknown",
        plan: t.plan,
        amount: t.amount,
        status: t.status,
        paymentType: t.paymentType,
        createdAt: t.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  }

  // Credit transactions
  const where: Record<string, unknown> = {}
  if (userId) where.userId = userId
  if (feature) where.feature = feature

  const [transactions, total] = await Promise.all([
    prisma.credit_transactions.findMany({
      where,
      include: {
        users: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.credit_transactions.count({ where }),
  ])

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      userName: t.users?.name || "Unknown",
      userEmail: t.users?.email || "Unknown",
      type: t.type,
      amount: t.amount,
      balance: t.balance,
      description: t.description,
      feature: t.feature,
      createdAt: t.createdAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
}
