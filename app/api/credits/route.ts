import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/credits — Get current user's credit balance
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const credits = await prisma.user_credits.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json({
    balance: credits?.balance ?? 0,
  })
}

/**
 * POST /api/credits — Deduct credits for a feature usage
 * Body: { amount: number, feature: string, description?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { amount, feature, description } = await req.json()

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
  }

  if (!feature) {
    return NextResponse.json({ error: "Feature is required" }, { status: 400 })
  }

  const userId = session.user.id

  // Get current balance
  const credits = await prisma.user_credits.findUnique({
    where: { userId },
  })

  const currentBalance = credits?.balance ?? 0

  if (currentBalance < amount) {
    return NextResponse.json(
      { error: "Insufficient credits", balance: currentBalance, required: amount },
      { status: 402 }
    )
  }

  // Deduct credits + log transaction atomically
  const newBalance = currentBalance - amount

  await prisma.$transaction([
    // Update balance
    prisma.user_credits.upsert({
      where: { userId },
      update: { balance: newBalance, updatedAt: new Date() },
      create: { id: crypto.randomUUID(), userId, balance: newBalance, updatedAt: new Date() },
    }),
    // Log transaction
    prisma.credit_transactions.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: "deduct",
        amount: -amount,
        balance: newBalance,
        description: description || `${feature} generation`,
        feature,
      },
    }),
  ])

  console.log(`[credits] Deducted ${amount} credits for ${feature}. User: ${userId}, Balance: ${currentBalance} → ${newBalance}`)

  return NextResponse.json({ balance: newBalance })
}
