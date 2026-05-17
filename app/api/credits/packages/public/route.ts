import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/credits/packages/public — Public credit packages for landing page
 * No auth required. Returns only active packages.
 */
export async function GET() {
  try {
    const packages = await prisma.credit_packages.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        credits: true,
        price: true,
        bonusCredits: true,
        discountPercent: true,
        description: true,
        isPopular: true,
        sortOrder: true,
      },
    })

    return NextResponse.json({ packages })
  } catch {
    return NextResponse.json({ packages: [] })
  }
}
