"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  UsersIcon, DollarSignIcon, SparklesIcon, PackageIcon,
  TrendingUpIcon, TrendingDownIcon,
  UserCogIcon, CoinsIcon, BoxIcon, HistoryIcon,
  Loader2Icon,
} from "lucide-react"
import { AdminUsersTab } from "@/components/admin/admin-users-tab"
import { AdminCreditsTab } from "@/components/admin/admin-credits-tab"
import { AdminPackagesTab } from "@/components/admin/admin-packages-tab"
import { AdminHistoryTab } from "@/components/admin/admin-history-tab"

/* ─── Tab definition ─── */
type TabId = "users" | "credits" | "packages" | "history"

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "users", label: "Kelola User", icon: <UserCogIcon className="h-4 w-4" /> },
  { id: "credits", label: "Kelola Credit", icon: <CoinsIcon className="h-4 w-4" /> },
  { id: "packages", label: "Kelola Paket", icon: <BoxIcon className="h-4 w-4" /> },
  { id: "history", label: "Riwayat", icon: <HistoryIcon className="h-4 w-4" /> },
]

/* ─── Stat card config ─── */
interface AdminStats {
  totalUsers: number
  newUsersChange: number
  totalRevenue: number
  revenueThisMonth: number
  revenueChange: number
  totalGenerations: number
  generationsThisMonth: number
  generationsChange: number
  activePackages: number
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>("users")
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats")
      if (res.ok) {
        setStats(await res.json())
      }
    } catch { /* ignore */ } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(p)

  const statCards = stats ? [
    {
      title: "Total User",
      value: stats.totalUsers.toLocaleString(),
      change: stats.newUsersChange,
      icon: UsersIcon,
      iconBg: "bg-blue-500/10 text-blue-500",
      gradient: "from-blue-500/20 to-cyan-500/20",
    },
    {
      title: "Revenue Bulan Ini",
      value: formatPrice(stats.revenueThisMonth),
      change: stats.revenueChange,
      icon: DollarSignIcon,
      iconBg: "bg-violet-500/10 text-violet-500",
      gradient: "from-violet-500/20 to-purple-500/20",
    },
    {
      title: "Total Generasi AI",
      value: stats.totalGenerations.toLocaleString(),
      change: stats.generationsChange,
      icon: SparklesIcon,
      iconBg: "bg-amber-500/10 text-amber-500",
      gradient: "from-amber-500/20 to-orange-500/20",
    },
    {
      title: "Paket Aktif",
      value: String(stats.activePackages),
      change: 0,
      icon: PackageIcon,
      iconBg: "bg-emerald-500/10 text-emerald-500",
      gradient: "from-emerald-500/20 to-teal-500/20",
    },
  ] : []

  return (
    <>
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Admin Panel" },
      ]} />

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0 pb-8 overflow-y-auto">
        {/* Title */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-muted-foreground text-sm">
              Overview & manajemen platform Jenna Bot Pro
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5 self-start mt-2 sm:mt-0">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            All systems online
          </Badge>
        </div>

        {/* Stat cards */}
        {statsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card
                key={stat.title}
                className="relative overflow-hidden border py-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="text-sm font-medium">{stat.title}</CardDescription>
                  <div className={`rounded-lg p-2 ${stat.iconBg}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                  {stat.change !== 0 && (
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      {stat.change > 0 ? (
                        <TrendingUpIcon className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <TrendingDownIcon className="h-3 w-3 text-red-500" />
                      )}
                      <span className={stat.change > 0 ? "font-medium text-emerald-500" : "font-medium text-red-500"}>
                        {stat.change > 0 ? "+" : ""}{stat.change}%
                      </span>
                      <span className="text-muted-foreground">vs bulan lalu</span>
                    </div>
                  )}
                </CardContent>
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-20 ${stat.gradient}`} />
              </Card>
            ))}
          </div>
        )}

        {/* Tabs navigation */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-muted/30 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "users" && <AdminUsersTab />}
          {activeTab === "credits" && <AdminCreditsTab />}
          {activeTab === "packages" && <AdminPackagesTab />}
          {activeTab === "history" && <AdminHistoryTab />}
        </div>
      </div>
    </>
  )
}
