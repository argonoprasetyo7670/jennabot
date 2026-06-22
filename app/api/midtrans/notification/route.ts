import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { activateSubscription } from "@/app/api/subscription/purchase/route"

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_PRODUCTION_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY || ""

/**
 * POST /api/midtrans/notification — Midtrans payment webhook
 * Called by Midtrans when payment status changes.
 * NO auth required — Midtrans sends this server-to-server.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
    } = body

    // ===== EDUTASKY ROUTING (before signature check — different server key) =====
    // Jika order_id mengandung "EDTKSY", forward ke EduTasky tanpa verifikasi
    // karena EduTasky pakai server key berbeda (sandbox vs production)
    if (order_id.includes("EDTKSY")) {
      const edutaskyUrl = process.env.EDUTASKY_WEBHOOK_URL || "https://edutasky.id/api/midtrans/callback"
      const webhookSecret = process.env.EDUTASKY_WEBHOOK_SECRET || ""

      try {
        const forwardRes = await fetch(edutaskyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-secret": webhookSecret,
          },
          body: JSON.stringify(body),
        })

        const forwardData = await forwardRes.json()
        console.log(`[midtrans] Forwarded EDTKSY order ${order_id} to EduTasky → ${forwardRes.status}`)
        return NextResponse.json({ status: "forwarded", edutasky: forwardData })
      } catch (forwardErr) {
        console.error(`[midtrans] Failed to forward to EduTasky:`, forwardErr)
        return NextResponse.json({ error: "Failed to forward to EduTasky" }, { status: 502 })
      }
    }
    // ===== END EDUTASKY ROUTING =====

    // Verify signature: SHA512(order_id + status_code + gross_amount + server_key)
    const expectedSignature = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)
      .digest("hex")

    if (signature_key !== expectedSignature) {
      console.error(`[midtrans] Invalid signature for order ${order_id}`)
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    // Find the transaction
    const transaction = await prisma.transactions.findUnique({
      where: { orderId: order_id },
    })

    if (!transaction) {
      console.error(`[midtrans] Transaction not found: ${order_id}`)
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Determine payment status
    let newStatus = "pending"

    if (transaction_status === "capture") {
      // Credit card: check fraud status
      newStatus = fraud_status === "accept" ? "success" : "challenge"
    } else if (transaction_status === "settlement") {
      newStatus = "success"
    } else if (
      transaction_status === "deny" ||
      transaction_status === "cancel" ||
      transaction_status === "expire"
    ) {
      newStatus = "failed"
    } else if (transaction_status === "pending") {
      newStatus = "pending"
    }

    // Update transaction record
    await prisma.transactions.update({
      where: { orderId: order_id },
      data: {
        status: newStatus,
        paymentType: payment_type || null,
        transactionId: transaction_id || null,
        fraudStatus: fraud_status || null,
        midtransResponse: JSON.stringify(body),
        updatedAt: new Date(),
      },
    })

    console.log(
      `[midtrans] Order ${order_id}: ${transaction_status} → ${newStatus} (payment: ${payment_type})`
    )

    // On successful payment → handle based on order type
    if (newStatus === "success" && transaction.status !== "success") {
      if (order_id.startsWith("SUB-")) {
        // ── Subscription purchase ──
        await activateSubscriptionFromPurchase(transaction.userId, transaction.plan, transaction.orderId, transaction.promoCode, transaction.amount)
      } else {
        // ── Credit purchase ──
        await addCreditsFromPurchase(transaction.userId, transaction.plan, transaction.orderId, transaction.promoCode, transaction.amount)
      }
    }

    return NextResponse.json({ status: "ok" })
  } catch (err) {
    console.error("[midtrans] Webhook error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

/**
 * Parse credits from the plan name and add to user balance
 */
async function addCreditsFromPurchase(userId: string, plan: string, orderId: string, promoCode: string | null, transactionAmount: number) {
  // Plan format: "Pro - 550 Credits"
  const creditsMatch = plan.match(/(\d+)\s*Credits/i)
  if (!creditsMatch) {
    console.error(`[midtrans] Could not parse credits from plan: ${plan}`)
    return
  }

  const creditsToAdd = parseInt(creditsMatch[1], 10)

  // Get current balance
  const currentCredits = await prisma.user_credits.findUnique({
    where: { userId },
  })

  const currentBalance = currentCredits?.balance ?? 0
  const newBalance = currentBalance + creditsToAdd

  const transactionOperations = [
    // Upsert user credits
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
    // Log credit transaction
    prisma.credit_transactions.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: "topup",
        amount: creditsToAdd,
        balance: newBalance,
        description: `Pembelian ${plan}${promoCode ? ` (Promo: ${promoCode})` : ""}`,
        feature: "purchase",
        referenceId: orderId,
      },
    }),
  ]

  // Jika transaksi memakai kode promo, tambahkan ke counter promo_codes atau berikan komisi referral
  if (promoCode) {
    const isPromo = await prisma.promo_codes.findUnique({ where: { code: promoCode } })
    if (isPromo) {
      transactionOperations.push(
        prisma.promo_codes.update({
          where: { code: promoCode },
          data: { currentUses: { increment: 1 } },
        }) as any
      )
    } else {
      const referrer = await prisma.users.findUnique({ where: { referralCode: promoCode } })
      if (referrer) {
        const commission = Math.floor(transactionAmount * 0.1)
        transactionOperations.push(
          prisma.users.update({
            where: { id: referrer.id },
            data: { referralEarnings: { increment: commission } }
          }) as any
        )
        transactionOperations.push(
          prisma.referrals.create({
            data: {
              id: crypto.randomUUID(),
              referrerId: referrer.id,
              referredId: userId,
              status: "success",
              reward: commission,
              updatedAt: new Date()
            }
          }) as any
        )
      }
    }
  }

  await prisma.$transaction(transactionOperations)

  console.log(
    `[credits] Added ${creditsToAdd} credits for user ${userId}. Balance: ${currentBalance} → ${newBalance}`
  )
}

/**
 * Activate subscription from a successful Midtrans payment.
 * Plan format: "Langganan Pro - 14 Hari"
 */
async function activateSubscriptionFromPurchase(userId: string, plan: string, orderId: string, promoCode: string | null, transactionAmount: number) {
  // Parse plan name from transaction plan string
  const nameMatch = plan.match(/Langganan\s+(\w+)/i)
  const planName = nameMatch ? nameMatch[1] : "Unknown"

  // Find the plan in DB
  const dbPlan = await prisma.subscription_plans.findFirst({
    where: { name: planName, isActive: true },
  })

  if (!dbPlan) {
    console.error(`[subscription] Plan not found for: ${plan} (parsed: ${planName})`)
    return
  }

  await activateSubscription(userId, dbPlan.id, dbPlan.name, dbPlan.duration, dbPlan.price)

  // Increment promo usage or give referral commission
  if (promoCode) {
    const isPromo = await prisma.promo_codes.findUnique({ where: { code: promoCode } })
    if (isPromo) {
      await prisma.promo_codes.update({
        where: { code: promoCode },
        data: { currentUses: { increment: 1 } },
      }).catch(() => {
        console.warn(`[subscription] Failed to increment promo usage: ${promoCode}`)
      })
    } else {
      const referrer = await prisma.users.findUnique({ where: { referralCode: promoCode } })
      if (referrer) {
        const commission = Math.floor(transactionAmount * 0.1)
        await prisma.users.update({
          where: { id: referrer.id },
          data: { referralEarnings: { increment: commission } }
        }).catch(() => {})
        await prisma.referrals.create({
          data: {
            id: crypto.randomUUID(),
            referrerId: referrer.id,
            referredId: userId,
            status: "success",
            reward: commission,
            updatedAt: new Date()
          }
        }).catch(() => {})
      }
    }
  }

  console.log(
    `[subscription] Activated ${dbPlan.name} (${dbPlan.duration} days) for user ${userId} via order ${orderId}`
  )
}
