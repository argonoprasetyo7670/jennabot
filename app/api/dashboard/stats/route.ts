import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/dashboard/stats — Get current user's dashboard statistics (real data)
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const [
    totalImages,
    imagesThisMonth,
    imagesPrevMonth,
    totalVideos,
    videosThisMonth,
    videosPrevMonth,
    creditBalance,
    totalCreditsUsed,
    creditsThisMonth,
    creditsPrevMonth,
    totalGalleryItems,
    galleryThisMonth,
    galleryPrevMonth,
    totalRevenue,
    revenueThisMonth,
    revenuePrevMonth,
  ] = await Promise.all([
    // Image counts from gallery_items
    prisma.gallery_items.count({ where: { userId, type: "image" } }),
    prisma.gallery_items.count({ where: { userId, type: "image", createdAt: { gte: thirtyDaysAgo } } }),
    prisma.gallery_items.count({ where: { userId, type: "image", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    // Video counts
    prisma.gallery_items.count({ where: { userId, type: "video" } }),
    prisma.gallery_items.count({ where: { userId, type: "video", createdAt: { gte: thirtyDaysAgo } } }),
    prisma.gallery_items.count({ where: { userId, type: "video", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    // Current credit balance
    prisma.user_credits.findUnique({ where: { userId }, select: { balance: true } }),
    // Total credits used (sum of deductions)
    prisma.credit_transactions.aggregate({
      where: { userId, type: "deduct" },
      _sum: { amount: true },
    }),
    prisma.credit_transactions.count({ where: { userId, type: "deduct", createdAt: { gte: thirtyDaysAgo } } }),
    prisma.credit_transactions.count({ where: { userId, type: "deduct", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    // Gallery items total
    prisma.gallery_items.count({ where: { userId } }),
    prisma.gallery_items.count({ where: { userId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.gallery_items.count({ where: { userId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    // Revenue (user's successful transactions)
    prisma.transactions.aggregate({
      where: { userId, status: "settlement" },
      _sum: { amount: true },
    }),
    prisma.transactions.aggregate({
      where: { userId, status: "settlement", createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
    prisma.transactions.aggregate({
      where: { userId, status: "settlement", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
  ])

  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100 * 10) / 10
  }

  return NextResponse.json({
    totalImages,
    imagesChange: calcChange(imagesThisMonth, imagesPrevMonth),
    totalVideos,
    videosChange: calcChange(videosThisMonth, videosPrevMonth),
    creditBalance: creditBalance?.balance ?? 0,
    totalCreditsUsed: Math.abs(totalCreditsUsed._sum.amount || 0),
    creditsChange: calcChange(creditsThisMonth, creditsPrevMonth),
    totalGalleryItems,
    galleryChange: calcChange(galleryThisMonth, galleryPrevMonth),
    totalRevenue: totalRevenue._sum.amount || 0,
    revenueThisMonth: revenueThisMonth._sum.amount || 0,
    revenueChange: calcChange(
      revenueThisMonth._sum.amount || 0,
      revenuePrevMonth._sum.amount || 0
    ),
  })
}
