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
 * POST /api/admin/credits — Adjust user credits
 * Body: { userId, amount, type: "add"|"deduct", description? }
 */
export async function POST(req: NextRequest) {
  const adminId = await verifyAdmin()
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { userId, amount, type, description } = await req.json()

  if (!userId || !amount || !type) {
    return NextResponse.json({ error: "userId, amount, and type are required" }, { status: 400 })
  }

  if (!["add", "deduct"].includes(type)) {
    return NextResponse.json({ error: "type must be 'add' or 'deduct'" }, { status: 400 })
  }

  const numAmount = Math.abs(Number(amount))
  if (isNaN(numAmount) || numAmount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
  }

  // Get current balance
  const current = await prisma.user_credits.findUnique({ where: { userId } })
  const currentBalance = current?.balance ?? 0

  if (type === "deduct" && currentBalance < numAmount) {
    return NextResponse.json(
      { error: "Saldo tidak cukup", balance: currentBalance, required: numAmount },
      { status: 400 }
    )
  }

  const delta = type === "add" ? numAmount : -numAmount
  const newBalance = currentBalance + delta

  await prisma.$transaction([
    prisma.user_credits.upsert({
      where: { userId },
      update: { balance: newBalance, updatedAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        userId,
        balance: newBalance,
        updatedAt: new Date(),
      },
    }),
    prisma.credit_transactions.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: type === "add" ? "admin_add" : "admin_deduct",
        amount: delta,
        balance: newBalance,
        description: description || `Admin ${type} oleh ${adminId}`,
        feature: "admin",
        referenceId: adminId,
      },
    }),
  ])

  return NextResponse.json({ balance: newBalance, previousBalance: currentBalance })
}
