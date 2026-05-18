import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

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
 * GET /api/admin/packages — List ALL packages (including inactive)
 */
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const packages = await prisma.credit_packages.findMany({
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json({ packages })
}

/**
 * POST /api/admin/packages — Create a new package
 */
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { name, credits, price, bonusCredits, discountPercent, description, isActive, isPopular, sortOrder } = body

  if (!name || !credits || !price) {
    return NextResponse.json({ error: "name, credits, and price are required" }, { status: 400 })
  }

  const pkg = await prisma.credit_packages.create({
    data: {
      id: `pkg-${crypto.randomUUID().slice(0, 8)}`,
      name,
      credits: Number(credits),
      price: Number(price),
      bonusCredits: Number(bonusCredits || 0),
      discountPercent: Number(discountPercent || 0),
      description: description || null,
      isActive: isActive !== false,
      isPopular: isPopular === true,
      sortOrder: Number(sortOrder || 0),
      updatedAt: new Date(),
    },
  })

  return NextResponse.json({ package: pkg }, { status: 201 })
}

/**
 * PATCH /api/admin/packages — Update a package
 */
export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: "Package id is required" }, { status: 400 })
  }

  // Only allow safe fields
  const data: Record<string, unknown> = { updatedAt: new Date() }
  const allowedFields = ["name", "credits", "price", "bonusCredits", "discountPercent", "description", "isActive", "isPopular", "sortOrder"]
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      data[key] = ["credits", "price", "bonusCredits", "discountPercent", "sortOrder"].includes(key)
        ? Number(updates[key])
        : updates[key]
    }
  }

  const pkg = await prisma.credit_packages.update({
    where: { id },
    data,
  })

  return NextResponse.json({ package: pkg })
}

/**
 * DELETE /api/admin/packages — Delete a package
 */
export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await req.json()

  if (!id) {
    return NextResponse.json({ error: "Package id is required" }, { status: 400 })
  }

  await prisma.credit_packages.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
