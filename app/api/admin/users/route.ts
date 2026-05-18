import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/** Helper: verify admin role from DB */
async function verifyAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (user?.role !== "admin") return null
  return session.user.id
}

/**
 * GET /api/admin/users — List all users with search & pagination
 * Query: ?page=1&limit=20&search=email@example.com&role=admin
 */
export async function GET(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = req.nextUrl
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))
  const search = url.searchParams.get("search") || ""
  const role = url.searchParams.get("role") || ""

  // Build filter
  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ]
  }
  if (role) {
    where.role = role
  }

  const [users, total] = await Promise.all([
    prisma.users.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        isReseller: true,
        user_credits: { select: { balance: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.users.count({ where }),
  ])

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      creditBalance: u.user_credits?.balance ?? 0,
      user_credits: undefined,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
}

/**
 * PATCH /api/admin/users — Update a user
 * Body: { userId, role?, name? }
 */
export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { userId, role, name } = await req.json()

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const data: Record<string, unknown> = { updatedAt: new Date() }
  if (role) data.role = role
  if (name !== undefined) data.name = name

  const updated = await prisma.users.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json({ user: updated })
}
