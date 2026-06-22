import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const DEFAULT_PLANS = [
  {
    id: crypto.randomUUID(),
    name: "Starter",
    price: 50000,
    duration: 7,
    features: [
      "Unlimited image generation",
      "Unlimited video generation",
      "Semua AI tools",
      "Gallery & download",
      "Sistem antrean",
    ],
    isActive: true,
    isPopular: false,
    discountPercent: 0,
  },
  {
    id: crypto.randomUUID(),
    name: "Pro",
    price: 100000,
    duration: 14,
    features: [
      "Unlimited image generation",
      "Unlimited video generation",
      "Semua AI tools",
      "Gallery & download",
      "Sistem antrean",
      "Priority support",
    ],
    isActive: true,
    isPopular: true,
    discountPercent: 0,
  },
  {
    id: crypto.randomUUID(),
    name: "Business",
    price: 150000,
    duration: 28,
    features: [
      "Unlimited image generation",
      "Unlimited video generation",
      "Semua AI tools",
      "Gallery & download",
      "Sistem antrean",
      "Priority support",
      "Akses fitur eksklusif",
    ],
    isActive: true,
    isPopular: false,
    discountPercent: 0,
  },
]

/**
 * GET /api/subscription/plans — Fetch all active subscription plans
 * Auto-seeds default plans if none exist.
 */
export async function GET() {
  try {
    let plans = await prisma.subscription_plans.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    })

    // Auto-seed if empty
    if (plans.length === 0) {
      const now = new Date()
      for (const plan of DEFAULT_PLANS) {
        await prisma.subscription_plans.create({
          data: {
            ...plan,
            createdAt: now,
            updatedAt: now,
          },
        })
      }
      plans = await prisma.subscription_plans.findMany({
        where: { isActive: true },
        orderBy: { price: "asc" },
      })
    }

    return NextResponse.json({ plans })
  } catch (error) {
    console.error("[subscription/plans] Error:", error)
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 })
  }
}
