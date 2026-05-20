// Force dynamic rendering — dashboard pages need auth (cookies/session)
// and cannot be statically prerendered at build time.
export const dynamic = "force-dynamic"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
