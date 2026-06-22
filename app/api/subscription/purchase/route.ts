import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_PRODUCTION_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY || ""
const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true"
const SNAP_URL = IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions"

/**
 * POST /api/subscription/purchase — Create Midtrans transaction for subscription
 * Body: { planId: string, promoCode?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { planId, promoCode } = await req.json()

  if (!planId) {
    return NextResponse.json({ error: "Plan ID is required" }, { status: 400 })
  }

  // Find the plan
  const plan = await prisma.subscription_plans.findUnique({
    where: { id: planId },
  })

  if (!plan || !plan.isActive) {
    return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 })
  }

  // Check if user already has an active subscription
  const existingSub = await prisma.subscriptions.findUnique({
    where: { userId: session.user.id },
  })

  if (existingSub && existingSub.status === "active" && new Date() < existingSub.endDate) {
    return NextResponse.json(
      { error: "Anda sudah memiliki langganan aktif. Tunggu hingga berakhir untuk membeli lagi." },
      { status: 409 }
    )
  }

  let finalPrice = plan.price
  let appliedPromo = null
  let discountAmount = 0

  // Validate promo code if provided
  if (promoCode) {
    const promoCodeUpper = promoCode.toUpperCase()
    const promo = await prisma.promo_codes.findUnique({
      where: { code: promoCodeUpper },
    })

    if (promo && promo.isActive) {
      const isNotExpired = !promo.expiresAt || new Date() <= promo.expiresAt
      const hasQuota = promo.maxUses === null || promo.currentUses < promo.maxUses

      if (isNotExpired && hasQuota) {
        if (promo.discountType === "percent") {
          discountAmount = Math.floor((plan.price * promo.discountValue) / 100)
        } else if (promo.discountType === "nominal") {
          discountAmount = promo.discountValue
        }

        if (discountAmount > plan.price) discountAmount = plan.price
        finalPrice = plan.price - discountAmount
        appliedPromo = promo.code
      }
    } else {
      // Cek apakah ini transaksi pertama user (belum pernah sukses)
      const successfulTransactionsCount = await prisma.transactions.count({
        where: {
          userId: session.user.id,
          status: { in: ["success", "settlement"] }
        }
      })
      const isFirstTime = successfulTransactionsCount === 0;

      const referrer = await prisma.users.findUnique({
        where: { referralCode: promoCodeUpper }
      })

      if (referrer && referrer.id !== session.user.id && isFirstTime) {
        discountAmount = Math.floor((plan.price * 10) / 100)
        finalPrice = plan.price - discountAmount
        appliedPromo = referrer.referralCode
      }
    }
  }

  const orderId = `SUB-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`

  // Create transaction record
  await prisma.transactions.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.user.id,
      orderId,
      plan: `Langganan ${plan.name} - ${plan.duration} Hari`,
      amount: finalPrice,
      promoCode: appliedPromo,
      discountAmount,
      status: "pending",
      updatedAt: new Date(),
    },
  })

  // Free subscription (100% promo)
  if (finalPrice <= 0) {
    await activateSubscription(session.user.id, plan.id, plan.name, plan.duration, 0)

    await prisma.transactions.update({
      where: { orderId },
      data: { status: "settlement", updatedAt: new Date() },
    })

    if (appliedPromo) {
      await prisma.promo_codes.update({
        where: { code: appliedPromo },
        data: { currentUses: { increment: 1 } },
      })
    }

    return NextResponse.json({
      token: "FREE",
      redirectUrl: `/dashboard/subscription?status=finish&order_id=${orderId}`,
      orderId,
    })
  }

  // Create Midtrans Snap token
  const authString = Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")

  const snapPayload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: finalPrice,
    },
    item_details: [
      {
        id: plan.id,
        name: `Langganan ${plan.name} (${plan.duration} Hari)`,
        price: plan.price,
        quantity: 1,
      },
      ...(discountAmount > 0
        ? [
            {
              id: "PROMO",
              name: `Promo Code: ${appliedPromo}`,
              price: -discountAmount,
              quantity: 1,
            },
          ]
        : []),
    ],
    customer_details: {
      first_name: session.user.name || "User",
      email: session.user.email,
    },
    callbacks: {
      finish: `${process.env.NEXTAUTH_URL}/dashboard/subscription?status=finish`,
    },
  }

  try {
    const snapRes = await fetch(SNAP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify(snapPayload),
    })

    if (!snapRes.ok) {
      const errBody = await snapRes.text()
      console.error("[subscription/purchase] Snap API error:", errBody)
      return NextResponse.json({ error: "Failed to create payment" }, { status: 500 })
    }

    const snapData = await snapRes.json()

    await prisma.transactions.update({
      where: { orderId },
      data: { midtransToken: snapData.token, updatedAt: new Date() },
    })

    console.log(
      `[subscription/purchase] Created order ${orderId} for ${plan.name} (${plan.duration} days, Rp ${finalPrice.toLocaleString()})`
    )

    return NextResponse.json({
      token: snapData.token,
      redirectUrl: snapData.redirect_url,
      orderId,
    })
  } catch (err) {
    console.error("[subscription/purchase] Snap request failed:", err)
    return NextResponse.json({ error: "Payment service unavailable" }, { status: 503 })
  }
}

/**
 * Activate or renew a subscription for a user.
 */
export async function activateSubscription(
  userId: string,
  planId: string,
  planName: string,
  durationDays: number,
  price: number
) {
  const now = new Date()
  const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)

  const existing = await prisma.subscriptions.findUnique({ where: { userId } })

  if (existing) {
    await prisma.subscriptions.update({
      where: { userId },
      data: {
        planId,
        plan: planName,
        status: "active",
        startDate: now,
        endDate,
        price,
        updatedAt: now,
      },
    })
  } else {
    await prisma.subscriptions.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        planId,
        plan: planName,
        status: "active",
        startDate: now,
        endDate,
        price,
        updatedAt: now,
      },
    })
  }

  console.log(
    `[subscription] Activated ${planName} for user ${userId}. Ends: ${endDate.toISOString()}`
  )
}
