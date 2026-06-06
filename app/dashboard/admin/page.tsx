"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  UsersIcon, DollarSignIcon, SparklesIcon, PackageIcon,
  TrendingUpIcon, TrendingDownIcon, ArrowUpRightIcon,
  UserCogIcon, CoinsIcon, BoxIcon, HistoryIcon,
  Loader2Icon, ArrowUpIcon, ArrowDownIcon,
  CreditCardIcon, ClockIcon, ChevronDownIcon,
} from "lucide-react"
import { AdminUsersTab } from "@/components/admin/admin-users-tab"
import { AdminCreditsTab } from "@/components/admin/admin-credits-tab"
import { AdminPackagesTab } from "@/components/admin/admin-packages-tab"
import { AdminHistoryTab } from "@/components/admin/admin-history-tab"
import { AdminGalleryTab } from "@/components/admin/admin-gallery-tab"
import { ImageIcon } from "lucide-react"

/* ─── Tab definition ─── */
type TabId = "users" | "credits" | "packages" | "history" | "gallery"

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "users", label: "Kelola User", icon: <UserCogIcon className="h-4 w-4" /> },
  { id: "credits", label: "Kelola Credit", icon: <CoinsIcon className="h-4 w-4" /> },
  { id: "packages", label: "Kelola Paket", icon: <BoxIcon className="h-4 w-4" /> },
  { id: "history", label: "Riwayat", icon: <HistoryIcon className="h-4 w-4" /> },
  { id: "gallery", label: "Kelola Gallery", icon: <ImageIcon className="h-4 w-4" /> },
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

/* ─── Dialog history types ─── */
type DialogTab = "credit" | "payment"

interface HistoryItem {
  id: string
  userName?: string
  userEmail?: string
  type: string
  amount: number
  balance?: number
  description?: string
  feature?: string | null
  orderId?: string
  plan?: string
  status?: string
  paymentType?: string | null
  createdAt: string
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>("users")
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTab, setDialogTab] = useState<DialogTab>("credit")
  const [dialogTitle, setDialogTitle] = useState("")

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

  function openStatDialog(tab: DialogTab, title: string) {
    setDialogTab(tab)
    setDialogTitle(title)
    setDialogOpen(true)
  }

  const statCards = stats ? [
    {
      title: "Total User",
      value: stats.totalUsers.toLocaleString(),
      change: stats.newUsersChange,
      icon: UsersIcon,
      iconBg: "bg-blue-500/10 text-blue-500",
      gradient: "from-blue-500/20 to-cyan-500/20",
      clickable: null as DialogTab | null,
    },
    {
      title: "Revenue Bulan Ini",
      value: formatPrice(stats.revenueThisMonth),
      change: stats.revenueChange,
      icon: DollarSignIcon,
      iconBg: "bg-violet-500/10 text-violet-500",
      gradient: "from-violet-500/20 to-purple-500/20",
      clickable: "payment" as DialogTab | null,
    },
    {
      title: "Total Generasi AI",
      value: stats.totalGenerations.toLocaleString(),
      change: stats.generationsChange,
      icon: SparklesIcon,
      iconBg: "bg-amber-500/10 text-amber-500",
      gradient: "from-amber-500/20 to-orange-500/20",
      clickable: "credit" as DialogTab | null,
    },
    {
      title: "Paket Aktif",
      value: String(stats.activePackages),
      change: 0,
      icon: PackageIcon,
      iconBg: "bg-emerald-500/10 text-emerald-500",
      gradient: "from-emerald-500/20 to-teal-500/20",
      clickable: null as DialogTab | null,
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
                className={`relative overflow-hidden border py-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                  stat.clickable ? "cursor-pointer group" : ""
                }`}
                onClick={() => stat.clickable && openStatDialog(stat.clickable, stat.title)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="text-sm font-medium">{stat.title}</CardDescription>
                  <div className={`rounded-lg p-2 ${stat.iconBg} ${stat.clickable ? "transition-transform group-hover:scale-110" : ""}`}>
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
                {/* Click indicator */}
                {stat.clickable && (
                  <div className="pointer-events-none absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRightIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
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
          {activeTab === "gallery" && <AdminGalleryTab />}
        </div>
      </div>

      {/* ─── Stat Card Detail Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HistoryIcon className="h-5 w-5 text-violet-500" />
              {dialogTitle}
            </DialogTitle>
            <DialogDescription>
              {dialogTab === "payment"
                ? "Riwayat transaksi pembayaran dari semua user"
                : "Riwayat penggunaan kredit dari semua user"}
            </DialogDescription>
          </DialogHeader>
          {dialogOpen && <AdminStatDialogContent tab={dialogTab} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ─── Admin Stat Dialog Content ─── */
function AdminStatDialogContent({ tab }: { tab: DialogTab }) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchItems = useCallback(async (p: number) => {
    if (p === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams({ type: tab, page: String(p), limit: "15" })
      const res = await fetch(`/api/admin/history?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (p === 1) {
          setItems(data.transactions || [])
        } else {
          setItems((prev) => [...prev, ...(data.transactions || [])])
        }
        setTotalPages(data.totalPages || 1)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [tab])

  useEffect(() => {
    setItems([])
    setPage(1)
    fetchItems(1)
  }, [fetchItems])

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(p)

  const statusColor = (s: string) => {
    if (s === "settlement" || s === "capture") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    if (s === "pending") return "bg-amber-500/10 text-amber-600 border-amber-500/20"
    if (s === "deny" || s === "cancel" || s === "expire") return "bg-red-500/10 text-red-600 border-red-500/20"
    return ""
  }

  const typeLabel = (t: string) => {
    const map: Record<string, { label: string; color: string }> = {
      deduct: { label: "Pemakaian", color: "text-red-400" },
      admin_deduct: { label: "Admin Kurangi", color: "text-red-400" },
      admin_add: { label: "Admin Tambah", color: "text-green-400" },
      topup: { label: "Top Up", color: "text-green-400" },
      purchase: { label: "Pembelian", color: "text-green-400" },
      refund: { label: "Refund", color: "text-amber-400" },
      referral: { label: "Referral", color: "text-blue-400" },
    }
    return map[t] || { label: t, color: "text-muted-foreground" }
  }

  return (
    <ScrollArea className="h-[420px] pr-3">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-3">
            <HistoryIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Belum ada data</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tab === "credit" && items.map((item) => {
            const tl = typeLabel(item.type)
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  item.amount < 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                }`}>
                  {item.amount < 0 ? <ArrowDownIcon className="h-4 w-4" /> : <ArrowUpIcon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{item.userName || "User"}</p>
                    <span className={`text-[10px] font-medium ${tl.color}`}>{tl.label}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{item.description}</p>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                      <ClockIcon className="h-2.5 w-2.5" />
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold tabular-nums ${item.amount < 0 ? "text-red-500" : "text-emerald-500"}`}>
                    {item.amount > 0 ? "+" : ""}{item.amount}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">Saldo: {item.balance}</p>
                </div>
              </div>
            )
          })}

          {tab === "payment" && items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                <CreditCardIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{item.userName || "User"}</p>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${statusColor(item.status || "")}`}>
                    {item.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">{item.plan}</span>
                  {item.paymentType && <span className="text-[10px] text-muted-foreground">• {item.paymentType}</span>}
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                    <ClockIcon className="h-2.5 w-2.5" />
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>
              <p className="text-sm font-bold tabular-nums shrink-0">{formatPrice(item.amount)}</p>
            </div>
          ))}

          {/* Load more */}
          {page < totalPages && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground"
                onClick={() => {
                  const next = page + 1
                  setPage(next)
                  fetchItems(next)
                }}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ChevronDownIcon className="h-3.5 w-3.5" />
                )}
                Muat lebih banyak
              </Button>
            </div>
          )}
        </div>
      )}
    </ScrollArea>
  )
}
