import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * PUT /api/user/referral
 * Update custom referral code
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { referralCode } = await req.json()

    if (!referralCode || typeof referralCode !== "string") {
      return NextResponse.json({ error: "Kode referral tidak valid" }, { status: 400 })
    }

    const codeStr = referralCode.toUpperCase().trim()

    // Validate length and format
    if (codeStr.length < 5 || codeStr.length > 20) {
      return NextResponse.json({ error: "Kode referral harus antara 5-20 karakter" }, { status: 400 })
    }

    if (!/^[A-Z0-9]+$/.test(codeStr)) {
      return NextResponse.json({ error: "Kode referral hanya boleh mengandung huruf dan angka" }, { status: 400 })
    }

    // Check if code is already used by another user
    const existing = await prisma.users.findUnique({
      where: { referralCode: codeStr }
    })

    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: "Kode referral ini sudah digunakan oleh pengguna lain" }, { status: 409 })
    }

    // Update code
    await prisma.users.update({
      where: { id: session.user.id },
      data: { referralCode: codeStr }
    })

    return NextResponse.json({ success: true, message: "Kode referral berhasil diperbarui", referralCode: codeStr })

  } catch (error) {
    console.error("[user-referral] Update error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
