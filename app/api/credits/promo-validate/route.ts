import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/credits/promo-validate?code=xyz — Check promo code validity
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    const codeStr = code.toUpperCase()

    // Cek apakah ini transaksi pertama user (belum pernah sukses)
    const successfulTransactionsCount = await prisma.transactions.count({
      where: {
        userId: session.user.id,
        status: { in: ["success", "settlement"] }
      }
    })
    
    const isFirstTime = successfulTransactionsCount === 0;

    // Ambil data promo code
    const promo = await prisma.promo_codes.findUnique({
      where: { code: codeStr },
    })

    if (!promo) {
      // Jika bukan promo biasa, cek apakah itu kode referral
      const referrer = await prisma.users.findUnique({
        where: { referralCode: codeStr }
      })

      if (referrer) {
        if (referrer.id === session.user.id) {
          return NextResponse.json({ isValid: false, message: "Anda tidak bisa menggunakan kode referral milik sendiri" })
        }
        
        if (!isFirstTime) {
          return NextResponse.json({ isValid: false, message: "Kode referral hanya berlaku untuk pembelian pertama" })
        }

        return NextResponse.json({
          isValid: true,
          message: "Kode referral berhasil diaplikasikan",
          code: referrer.referralCode,
          discountType: "percent",
          discountValue: 10,
        })
      }

      return NextResponse.json({ isValid: false, message: "Kode promo atau referral tidak ditemukan" })
    }

    // Validasi status aktif
    if (!promo.isActive) {
      return NextResponse.json({ isValid: false, message: "Kode promo sudah tidak aktif" })
    }

    // Validasi kuota
    if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
      return NextResponse.json({ isValid: false, message: "Kuota promo sudah habis" })
    }

    // Validasi expired
    if (promo.expiresAt && new Date() > promo.expiresAt) {
      return NextResponse.json({ isValid: false, message: "Kode promo sudah kadaluarsa" })
    }

    return NextResponse.json({
      isValid: true,
      message: "Kode promo berhasil diaplikasikan",
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
    })
  } catch (error) {
    console.error("[promo-validate] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
