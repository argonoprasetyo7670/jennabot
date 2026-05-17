import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/** Default packages seeded when DB is empty */
const DEFAULT_PACKAGES = [
  {
    id: "pkg-starter",
    name: "Starter",
    credits: 50,
    price: 25000,
    bonusCredits: 0,
    discountPercent: 0,
    description: "Cocok untuk mencoba fitur AI",
    isActive: true,
    isPopular: false,
    sortOrder: 1,
  },
  {
    id: "pkg-basic",
    name: "Basic",
    credits: 150,
    price: 65000,
    bonusCredits: 10,
    discountPercent: 0,
    description: "Untuk penggunaan harian",
    isActive: true,
    isPopular: false,
    sortOrder: 2,
  },
  {
    id: "pkg-pro",
    name: "Pro",
    credits: 500,
    price: 195000,
    bonusCredits: 50,
    discountPercent: 10,
    description: "Paling populer untuk kreator",
    isActive: true,
    isPopular: true,
    sortOrder: 3,
  },
  {
    id: "pkg-business",
    name: "Business",
    credits: 1500,
    price: 499000,
    bonusCredits: 200,
    discountPercent: 15,
    description: "Untuk tim dan bisnis",
    isActive: true,
    isPopular: false,
    sortOrder: 4,
  },
  {
    id: "pkg-enterprise",
    name: "Enterprise",
    credits: 5000,
    price: 1490000,
    bonusCredits: 1000,
    discountPercent: 20,
    description: "Volume tinggi, hemat maksimal",
    isActive: true,
    isPopular: false,
    sortOrder: 5,
  },
]

/**
 * GET /api/credits/packages — Fetch active credit packages
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if packages exist, seed if empty
  let packages = await prisma.credit_packages.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  })

  if (packages.length === 0) {
    // Seed default packages
    const now = new Date()
    for (const pkg of DEFAULT_PACKAGES) {
      await prisma.credit_packages.create({
        data: { ...pkg, updatedAt: now },
      })
    }
    packages = await prisma.credit_packages.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })
  }

  return NextResponse.json({ packages })
}
