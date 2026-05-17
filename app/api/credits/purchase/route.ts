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
 * POST /api/credits/purchase — Create a Midtrans Snap transaction for credit purchase
 * Body: { packageId: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { packageId } = await req.json()

  if (!packageId) {
    return NextResponse.json({ error: "Package ID is required" }, { status: 400 })
  }

  // Find the package
  const pkg = await prisma.credit_packages.findUnique({
    where: { id: packageId },
  })

  if (!pkg || !pkg.isActive) {
    return NextResponse.json({ error: "Package not found or inactive" }, { status: 404 })
  }

  const orderId = `CREDIT-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`
  const totalCredits = pkg.credits + pkg.bonusCredits

  // Create transaction record
  await prisma.transactions.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.user.id,
      orderId,
      plan: `${pkg.name} - ${totalCredits} Credits`,
      amount: pkg.price,
      status: "pending",
      updatedAt: new Date(),
    },
  })

  // Create Midtrans Snap token
  const authString = Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")

  const snapPayload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: pkg.price,
    },
    item_details: [
      {
        id: pkg.id,
        name: `${pkg.name} - ${pkg.credits} Credits${pkg.bonusCredits > 0 ? ` + ${pkg.bonusCredits} Bonus` : ""}`,
        price: pkg.price,
        quantity: 1,
      },
    ],
    customer_details: {
      first_name: session.user.name || "User",
      email: session.user.email,
    },
    callbacks: {
      finish: `${process.env.NEXTAUTH_URL}/dashboard/buy-credits?status=finish`,
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
      console.error("[midtrans] Snap API error:", errBody)
      return NextResponse.json({ error: "Failed to create payment" }, { status: 500 })
    }

    const snapData = await snapRes.json()

    // Update transaction with Midtrans token
    await prisma.transactions.update({
      where: { orderId },
      data: {
        midtransToken: snapData.token,
        updatedAt: new Date(),
      },
    })

    console.log(`[purchase] Created order ${orderId} for ${totalCredits} credits (Rp ${pkg.price.toLocaleString()})`)

    return NextResponse.json({
      token: snapData.token,
      redirectUrl: snapData.redirect_url,
      orderId,
    })
  } catch (err) {
    console.error("[midtrans] Snap request failed:", err)
    return NextResponse.json({ error: "Payment service unavailable" }, { status: 503 })
  }
}
