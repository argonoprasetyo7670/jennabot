import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/")
  }

  // Double-check role from DB (don't trust JWT alone for admin access)
  const dbUser = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (dbUser?.role !== "admin") {
    redirect("/dashboard")
  }

  return <>{children}</>
}
