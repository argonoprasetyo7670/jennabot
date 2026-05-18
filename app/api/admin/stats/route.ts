import { NextResponse } from "next/server"
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
 * GET /api/admin/stats — Get admin dashboard statistics
 */
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    newUsersThisMonth,
    newUsersPrevMonth,
    totalRevenue,
    revenueThisMonth,
    revenuePrevMonth,
    totalGenerations,
    generationsThisMonth,
    generationsPrevMonth,
    activePackages,
  ] = await Promise.all([
    prisma.users.count(),
    prisma.users.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.users.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    // Revenue from successful transactions
    prisma.transactions.aggregate({
      where: { status: "settlement" },
      _sum: { amount: true },
    }),
    prisma.transactions.aggregate({
      where: { status: "settlement", createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
    prisma.transactions.aggregate({
      where: { status: "settlement", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
    // Generation counts from credit_transactions (deductions = usage)
    prisma.credit_transactions.count({ where: { type: "deduct" } }),
    prisma.credit_transactions.count({ where: { type: "deduct", createdAt: { gte: thirtyDaysAgo } } }),
    prisma.credit_transactions.count({ where: { type: "deduct", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.credit_packages.count({ where: { isActive: true } }),
  ])

  // Calculate change percentages
  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100 * 10) / 10
  }

  return NextResponse.json({
    totalUsers,
    newUsersChange: calcChange(newUsersThisMonth, newUsersPrevMonth),
    totalRevenue: totalRevenue._sum.amount || 0,
    revenueThisMonth: revenueThisMonth._sum.amount || 0,
    revenueChange: calcChange(
      revenueThisMonth._sum.amount || 0,
      revenuePrevMonth._sum.amount || 0
    ),
    totalGenerations,
    generationsThisMonth,
    generationsChange: calcChange(generationsThisMonth, generationsPrevMonth),
    activePackages,
  })
}
