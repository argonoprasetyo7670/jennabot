import { DashboardHeader } from "@/components/dashboard-header"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ReferralClient } from "./referral-client"

export const metadata = {
  title: "Sistem Referral - Jenna Bot Pro",
  description: "Ajak teman dan dapatkan penghasilan 10%",
}

export default async function ReferralPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/")
  }

  // Ambil data user terkait referral
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: {
      referralCode: true,
      referralEarnings: true,
      referrals: {
        include: {
          users: { // Wait, referrals relation to referred users. 
            // In prisma schema: `users users @relation(fields: [referrerId], references: [id], onDelete: Cascade)`
            // But referred user is `referredId`. Does it have relation to `referredId`?
            // Actually, `referrals` model only has relation to `referrerId` (the inviter).
            // Let's fetch referred users separately if needed.
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!user) {
    redirect("/")
  }

  // Because referrals model only has relation to referrerId natively in the schema,
  // we need to manually fetch the referred users' names/emails.
  const referredUserIds = user.referrals.map(r => r.referredId)
  const referredUsersData = await prisma.users.findMany({
    where: { id: { in: referredUserIds } },
    select: { id: true, name: true, email: true, createdAt: true }
  })

  const referralsWithDetails = user.referrals.map(r => ({
    ...r,
    referredUser: referredUsersData.find(u => u.id === r.referredId)
  }))

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Akun", href: "/dashboard" },
        { label: "Referral" },
      ]} />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-6">

          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Program Referral</h1>
            <p className="text-muted-foreground">
              Ajak teman menggunakan Jenna Bot Pro. Teman Anda mendapat <strong className="text-foreground">diskon 10%</strong>, dan Anda mendapat <strong className="text-foreground">komisi 10%</strong> dari transaksi pertama mereka.
            </p>
          </div>

          <ReferralClient
            initialCode={user.referralCode || ""}
            earnings={user.referralEarnings}
            referrals={referralsWithDetails}
          />

        </div>
      </div>
    </div>
  )
}
