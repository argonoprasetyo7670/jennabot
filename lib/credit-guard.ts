import { prisma } from "@/lib/prisma"

/* ─── Credit Cost Constants ─── */
export const CREDIT_COST_IMAGE = 1      // per image
export const CREDIT_COST_VIDEO = 5      // per video
export const CREDIT_COST_UPSCALE = 10   // per upscale
export const CREDIT_COST_CHAT = 1       // per workflow-agent request
export const CREDIT_COST_MOTION = 120   // per motion-control task
export const CREDIT_COST_TTS = 3        // per text-to-speech generation
export const CREDIT_COST_SFX = 5        // per sound effect generation

/**
 * Check if a user has enough credits for an operation.
 * Returns current balance and whether it's sufficient.
 */
export async function checkCredits(
  userId: string,
  requiredAmount: number
): Promise<{ sufficient: boolean; balance: number }> {
  const credits = await prisma.user_credits.findUnique({
    where: { userId },
  })
  const balance = credits?.balance ?? 0
  return { sufficient: balance >= requiredAmount, balance }
}

/**
 * Atomically deduct credits from a user's balance.
 * Uses Prisma $transaction to prevent race conditions.
 *
 * Returns the new balance after deduction, or null if insufficient funds.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  feature: string,
  description: string
): Promise<{ ok: true; balance: number } | { ok: false; balance: number }> {
  return prisma.$transaction(async (tx) => {
    const credits = await tx.user_credits.findUnique({ where: { userId } })
    const currentBalance = credits?.balance ?? 0

    if (currentBalance < amount) {
      return { ok: false as const, balance: currentBalance }
    }

    const newBalance = currentBalance - amount

    await tx.user_credits.upsert({
      where: { userId },
      update: { balance: newBalance, updatedAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        userId,
        balance: newBalance,
        updatedAt: new Date(),
      },
    })

    await tx.credit_transactions.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: "deduct",
        amount: -amount,
        balance: newBalance,
        description,
        feature,
      },
    })

    console.log(
      `[credit-guard] Deducted ${amount} credits for ${feature}. User: ${userId}, Balance: ${currentBalance} → ${newBalance}`
    )

    return { ok: true as const, balance: newBalance }
  }, {
    maxWait: 15000,
    timeout: 30000,
  })
}

/**
 * Refund credits back to a user (e.g. when an API call fails after pre-deduction).
 * Always succeeds — creates/increments balance.
 */
export async function refundCredits(
  userId: string,
  amount: number,
  feature: string
): Promise<number> {
  const credits = await prisma.user_credits.upsert({
    where: { userId },
    update: {
      balance: { increment: amount },
      updatedAt: new Date(),
    },
    create: {
      id: crypto.randomUUID(),
      userId,
      balance: amount,
      updatedAt: new Date(),
    },
  })

  await prisma.credit_transactions.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      type: "refund",
      amount: amount,
      balance: credits.balance,
      description: `Refund ${feature} (API error)`,
      feature,
    },
  })

  console.log(
    `[credit-guard] Refunded ${amount} credits for ${feature}. User: ${userId}, New balance: ${credits.balance}`
  )

  return credits.balance
}
