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

    // Ambil data promo code
    const promo = await prisma.promo_codes.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!promo) {
      return NextResponse.json({ isValid: false, message: "Kode promo tidak ditemukan" })
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
