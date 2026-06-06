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

  const { packageId, promoCode } = await req.json()

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

  let finalPrice = pkg.price
  let appliedPromo = null
  let discountAmount = 0

  // Validasi Promo Code jika ada
  if (promoCode) {
    const promo = await prisma.promo_codes.findUnique({
      where: { code: promoCode.toUpperCase() },
    })

    if (promo && promo.isActive) {
      const isNotExpired = !promo.expiresAt || new Date() <= promo.expiresAt
      const hasQuota = promo.maxUses === null || promo.currentUses < promo.maxUses

      if (isNotExpired && hasQuota) {
        if (promo.discountType === "percent") {
          discountAmount = Math.floor((pkg.price * promo.discountValue) / 100)
        } else if (promo.discountType === "nominal") {
          discountAmount = promo.discountValue
        }

        if (discountAmount > pkg.price) {
          discountAmount = pkg.price
        }

        finalPrice = pkg.price - discountAmount
        appliedPromo = promo.code
      }
    }
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
      amount: finalPrice, // Menggunakan harga setelah diskon
      promoCode: appliedPromo,
      discountAmount: discountAmount,
      status: "pending",
      updatedAt: new Date(),
    },
  })

  // Jika harga akhir jadi Rp 0 (misal kupon 100% / Free)
  // Anda bisa memutuskan apakah tetap butuh ke midtrans atau langsung selesai.
  // Untuk amannya, kita anggap minimal transaksi ke Midtrans adalah Rp 1, 
  // kecuali kalau benar-benar Rp 0 maka kita langsung success.
  if (finalPrice <= 0) {
    // Update transaksi menjadi success
    await prisma.transactions.update({
      where: { orderId },
      data: { status: "settlement", updatedAt: new Date() },
    })
    
    // Tambahkan kredit ke user
    await prisma.user_credits.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        balance: totalCredits,
        updatedAt: new Date()
      },
      update: {
        balance: { increment: totalCredits },
        updatedAt: new Date()
      }
    })

    // Catat log
    await prisma.credit_transactions.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        type: "purchase",
        amount: totalCredits,
        balance: 0, // Should be actual balance, but let's just log it
        description: `Beli Paket ${pkg.name} (Gratis via Promo ${appliedPromo})`,
      }
    })

    // Tambah currentUses promo
    if (appliedPromo) {
      await prisma.promo_codes.update({
        where: { code: appliedPromo },
        data: { currentUses: { increment: 1 } }
      })
    }

    return NextResponse.json({
      token: "FREE",
      redirectUrl: `/dashboard/buy-credits?status=finish&order_id=${orderId}`,
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
        id: pkg.id,
        name: `${pkg.name} - ${pkg.credits} Credits${pkg.bonusCredits > 0 ? ` + ${pkg.bonusCredits} Bonus` : ""}`,
        price: pkg.price,
        quantity: 1,
      },
      ...(discountAmount > 0 ? [{
        id: "PROMO",
        name: `Promo Code: ${appliedPromo}`,
        price: -discountAmount,
        quantity: 1,
      }] : []),
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

    console.log(`[purchase] Created order ${orderId} for ${totalCredits} credits (Rp ${finalPrice.toLocaleString()}) with promo: ${appliedPromo}`)

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
