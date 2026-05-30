"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ImageIcon,
  VideoIcon,
  SparklesIcon,
  ArrowUpRightIcon,
  ClockIcon,
  StarIcon,
  CoinsIcon,
  WalletIcon,
  HistoryIcon,
  CreditCardIcon,
  Loader2Icon,
  ChevronDownIcon,
} from "lucide-react"

/* ─── stat card types ─── */
interface StatConfig {
  key: string
  title: string
  icon: typeof ImageIcon
  gradient: string
  iconBg: string
  dialogType: "generations" | "credits" | "payments" | null
}

const statConfigs: StatConfig[] = [
  {
    key: "images",
    title: "Total Gambar",
    icon: ImageIcon,
    gradient: "from-violet-500/20 to-purple-500/20",
    iconBg: "bg-violet-500/10 text-violet-500",
    dialogType: "generations",
  },
  {
    key: "videos",
    title: "Total Video",
    icon: VideoIcon,
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconBg: "bg-blue-500/10 text-blue-500",
    dialogType: "generations",
  },
  {
    key: "credits",
    title: "Kredit Terpakai",
    icon: CoinsIcon,
    gradient: "from-amber-500/20 to-orange-500/20",
    iconBg: "bg-amber-500/10 text-amber-500",
    dialogType: "credits",
  },
  {
    key: "gallery",
    title: "Item di Gallery",
    icon: SparklesIcon,
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconBg: "bg-emerald-500/10 text-emerald-500",
    dialogType: "generations",
  },
]

/* ─── chart data (weekly) ─── */
const chartData = [
  { day: "Mon", images: 42, videos: 18 },
  { day: "Tue", images: 58, videos: 24 },
  { day: "Wed", images: 35, videos: 15 },
  { day: "Thu", images: 72, videos: 32 },
  { day: "Fri", images: 64, videos: 28 },
  { day: "Sat", images: 88, videos: 42 },
  { day: "Sun", images: 52, videos: 22 },
]
const chartMax = Math.max(...chartData.map((d) => d.images + d.videos))

/* ─── top models ─── */
const topModels = [
  { name: "Imagen 4", usage: 82, requests: "4,291", color: "bg-violet-500" },
  { name: "Veo 3.1 Fast", usage: 64, requests: "3,180", color: "bg-blue-500" },
  { name: "Nano Banana Pro", usage: 51, requests: "2,540", color: "bg-cyan-500" },
  { name: "Nano Banana 2", usage: 43, requests: "2,105", color: "bg-amber-500" },
]

/* ─── quick actions — from shared constants ─── */
import { DASHBOARD_FEATURES } from "@/lib/features"

/* ─── History item types ─── */
interface CreditItem {
  id: string
  type: string
  amount: number
  balance: number
  description: string
  feature: string | null
  createdAt: string
}

interface GenerationItem {
  id: string
  type: string
  gcsUrl: string
  prompt: string | null
  model: string | null
  aspectRatio: string | null
  sourceAction: string | null
  createdAt: string
}

interface PaymentItem {
  id: string
  orderId: string
  plan: string
  amount: number
  status: string
  paymentType: string | null
  createdAt: string
}

/* ─── Stats type ─── */
interface DashboardStats {
  totalImages: number
  imagesChange: number
  totalVideos: number
  videosChange: number
  creditBalance: number
  totalCreditsUsed: number
  creditsChange: number
  totalGalleryItems: number
  galleryChange: number
  totalRevenue: number
  revenueThisMonth: number
  revenueChange: number
}

/* ─── format helpers ─── */
function formatNumber(n: number | undefined | null): string {
  if (n == null) return "0"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`
  return n.toLocaleString("id-ID")
}

function formatCurrency(n: number | undefined | null): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n ?? 0)
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diff = now - d
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "baru saja"
  if (mins < 60) return `${mins} menit lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam lalu`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} hari lalu`
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

function featureLabel(feature: string | null): string {
  const map: Record<string, string> = {
    "image-generator": "Image Generator",
    "video-generator": "Video Generator",
    "image-upscale": "Image Upscale",
    "motion-control": "Motion Control",
    "workflow-agent": "Workflow Agent",
    "review-product": "Review Product",
    "product-studio": "Product Studio",
    "model-studio": "Model Studio",
    "thumbnail": "Thumbnail",
  }
  return feature ? (map[feature] || feature) : "—"
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    settlement: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    failed: "bg-red-500/10 text-red-600 border-red-500/20",
    deny: "bg-red-500/10 text-red-600 border-red-500/20",
    expire: "bg-muted text-muted-foreground border-muted",
  }
  return colors[status] || "bg-muted text-muted-foreground"
}

/* ─── History Dialog Content ─── */
function HistoryDialogContent({
  dialogType,
  defaultTab,
}: {
  dialogType: string
  defaultTab: string
}) {
  const [tab, setTab] = useState(defaultTab)
  const [items, setItems] = useState<(CreditItem | GenerationItem | PaymentItem)[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  const fetchItems = useCallback(async (cursor?: string | null) => {
    const isMore = !!cursor
    if (isMore) setLoadingMore(true)
    else setLoading(true)

    try {
      const params = new URLSearchParams({ tab })
      if (cursor) params.set("cursor", cursor)
      const res = await fetch(`/api/dashboard/history?${params}`)
      const data = await res.json()

      if (isMore) {
        setItems((prev) => [...prev, ...data.items])
      } else {
        setItems(data.items || [])
      }
      setNextCursor(data.nextCursor || null)
    } catch {
      console.error("Failed to fetch history")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [tab])

  useEffect(() => {
    setItems([])
    setNextCursor(null)
    fetchItems()
  }, [fetchItems])

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="credits" className="gap-1.5 text-xs sm:text-sm">
          <CoinsIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Kredit</span>
          <span className="sm:hidden">Kredit</span>
        </TabsTrigger>
        <TabsTrigger value="generations" className="gap-1.5 text-xs sm:text-sm">
          <ImageIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Generate</span>
          <span className="sm:hidden">Gen</span>
        </TabsTrigger>
        <TabsTrigger value="payments" className="gap-1.5 text-xs sm:text-sm">
          <CreditCardIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Pembayaran</span>
          <span className="sm:hidden">Bayar</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value={tab} className="mt-4">
        <ScrollArea className="h-[400px] pr-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
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
              <p className="text-xs text-muted-foreground/60 mt-1">
                {tab === "credits" && "Riwayat kredit akan muncul setelah Anda menggunakan fitur AI."}
                {tab === "generations" && "Hasil generate akan muncul di sini setelah Anda membuat gambar atau video."}
                {tab === "payments" && "Riwayat pembayaran akan muncul setelah Anda membeli kredit."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tab === "credits" && (items as CreditItem[]).map((item) => (
                <div key={item.id} className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    item.type === "deduct"
                      ? "bg-red-500/10 text-red-500"
                      : item.type === "refund"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-emerald-500/10 text-emerald-500"
                  }`}>
                    {item.type === "deduct" ? (
                      <TrendingDownIcon className="h-4 w-4" />
                    ) : (
                      <TrendingUpIcon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.feature && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{featureLabel(item.feature)}</Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <ClockIcon className="h-2.5 w-2.5" />
                        {formatTimeAgo(item.createdAt)}
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
              ))}

              {tab === "generations" && (items as GenerationItem[]).map((item) => (
                <div key={item.id} className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    item.type === "video"
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-violet-500/10 text-violet-500"
                  }`}>
                    {item.type === "video" ? (
                      <VideoIcon className="h-4 w-4" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.prompt || "Tanpa prompt"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.model && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{item.model}</Badge>
                      )}
                      {item.aspectRatio && (
                        <span className="text-[10px] text-muted-foreground">{item.aspectRatio}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <ClockIcon className="h-2.5 w-2.5" />
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                    {item.type === "video" ? "Video" : "Gambar"}
                  </Badge>
                </div>
              ))}

              {tab === "payments" && (items as PaymentItem[]).map((item) => (
                <div key={item.id} className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                    <WalletIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.plan}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${statusBadge(item.status)}`}>
                        {item.status}
                      </Badge>
                      {item.paymentType && (
                        <span className="text-[10px] text-muted-foreground">{item.paymentType}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <ClockIcon className="h-2.5 w-2.5" />
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-bold tabular-nums shrink-0">{formatCurrency(item.amount)}</p>
                </div>
              ))}

              {/* Load more */}
              {nextCursor && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-muted-foreground"
                    onClick={() => fetchItems(nextCursor)}
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
      </TabsContent>
    </Tabs>
  )
}

/* ─── Main Page ─── */
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<string>("credits")
  const [dialogTitle, setDialogTitle] = useState("")
  const [defaultTab, setDefaultTab] = useState("credits")

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data)
        setStatsLoading(false)
      })
      .catch(() => setStatsLoading(false))
  }, [])

  function getStatValue(key: string): string {
    if (!stats) return "—"
    switch (key) {
      case "images": return formatNumber(stats.totalImages)
      case "videos": return formatNumber(stats.totalVideos)
      case "credits": return formatNumber(stats.totalCreditsUsed)
      case "gallery": return formatNumber(stats.totalGalleryItems)
      default: return "—"
    }
  }

  function getStatChange(key: string): { value: string; trend: "up" | "down" } {
    if (!stats) return { value: "—", trend: "up" }
    let change: number
    switch (key) {
      case "images": change = stats.imagesChange; break
      case "videos": change = stats.videosChange; break
      case "credits": change = stats.creditsChange; break
      case "gallery": change = stats.galleryChange; break
      default: change = 0
    }
    return {
      value: `${change >= 0 ? "+" : ""}${change}%`,
      trend: change >= 0 ? "up" : "down",
    }
  }

  function openDialog(config: StatConfig) {
    if (!config.dialogType) return
    const tabMap: Record<string, string> = {
      generations: "generations",
      credits: "credits",
      payments: "payments",
    }
    const titleMap: Record<string, string> = {
      images: "Riwayat Generate Gambar & Video",
      videos: "Riwayat Generate Gambar & Video",
      credits: "Riwayat Penggunaan Kredit",
      gallery: "Riwayat Generate Gambar & Video",
    }
    setDialogType(config.dialogType)
    setDefaultTab(tabMap[config.dialogType] || "credits")
    setDialogTitle(titleMap[config.key] || "Riwayat")
    setDialogOpen(true)
  }

  return (
    <>
      {/* ─── header ─── */}
      <DashboardHeader
        breadcrumbs={[
          { label: "Jenna Bot Pro", href: "/dashboard" },
          { label: "Dashboard" },
        ]}
      />

      {/* ─── main content ─── */}
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0 pb-8">
        {/* Title row */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Selamat datang! Berikut ringkasan workspace AI Anda.</p>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <Badge variant="outline" className="gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Semua sistem aktif
            </Badge>
          </div>
        </div>

        {/* ─── stat cards ─── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statConfigs.map((config) => {
            const change = getStatChange(config.key)
            const isClickable = !!config.dialogType

            return (
              <Card
                key={config.key}
                className={`relative overflow-hidden border py-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                  isClickable ? "cursor-pointer group" : ""
                }`}
                onClick={() => isClickable && openDialog(config)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="text-sm font-medium">{config.title}</CardDescription>
                  <div className={`rounded-lg p-2 ${config.iconBg} ${isClickable ? "transition-transform group-hover:scale-110" : ""}`}>
                    <config.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <>
                      <Skeleton className="h-7 w-20 mb-2" />
                      <Skeleton className="h-3 w-28" />
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold tracking-tight">{getStatValue(config.key)}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs">
                        {change.trend === "up" ? (
                          <TrendingUpIcon className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <TrendingDownIcon className="h-3 w-3 text-red-500" />
                        )}
                        <span className={change.trend === "up" ? "font-medium text-emerald-500" : "font-medium text-red-500"}>
                          {change.value}
                        </span>
                        <span className="text-muted-foreground">vs bulan lalu</span>
                      </div>
                    </>
                  )}
                </CardContent>
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-20 ${config.gradient}`} />
                {/* Clickable indicator */}
                {isClickable && (
                  <div className="pointer-events-none absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRightIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        {/* ─── charts + activity row ─── */}
        <div className="grid gap-4 lg:grid-cols-7">
          {/* Bar chart */}
          <Card className="lg:col-span-4 py-5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generasi AI</CardTitle>
                  <CardDescription>Volume generasi mingguan berdasarkan tipe</CardDescription>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                    Gambar
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    Video
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-48">
                {chartData.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <div className="relative flex w-full flex-col items-center gap-0.5" style={{ height: 160 }}>
                      <div
                        className="w-full max-w-8 rounded-t-md bg-violet-500/80 transition-all duration-500 hover:bg-violet-500"
                        style={{ height: `${(d.images / chartMax) * 100}%`, minHeight: 4 }}
                      />
                      <div
                        className="w-full max-w-8 rounded-b-md bg-blue-500/80 transition-all duration-500 hover:bg-blue-500"
                        style={{ height: `${(d.videos / chartMax) * 100}%`, minHeight: 4 }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium mt-1">{d.day}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="lg:col-span-3 py-5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Aktivitas Terbaru</CardTitle>
                  <CardDescription>Aksi terakhir di workspace Anda</CardDescription>
                </div>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  onClick={() => {
                    setDialogType("credits")
                    setDefaultTab("credits")
                    setDialogTitle("Riwayat Aktivitas")
                    setDialogOpen(true)
                  }}
                >
                  Lihat semua
                  <ArrowUpRightIcon className="h-3 w-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <RecentActivity />
            </CardContent>
          </Card>
        </div>

        {/* ─── models + quick actions row ─── */}
        <div className="grid gap-4 lg:grid-cols-7">
          {/* Top models */}
          <Card className="lg:col-span-3 py-5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Model Teratas</CardTitle>
                  <CardDescription>Model AI paling sering digunakan bulan ini</CardDescription>
                </div>
                <StarIcon className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {topModels.map((model) => (
                <div key={model.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-muted-foreground text-xs">{model.requests} requests</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                    <div className={`h-full rounded-full ${model.color} transition-all duration-700`} style={{ width: `${model.usage}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="lg:col-span-4 py-5">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Langsung masuk ke tools favorit Anda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {DASHBOARD_FEATURES.map((feature) => (
                  <Link
                    key={feature.title}
                    href={feature.url}
                    className="group relative flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-muted-foreground/20"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${feature.gradient} text-white shadow-sm text-lg`}>
                      {feature.emoji}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{feature.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{feature.description}</p>
                    </div>
                    <ArrowUpRightIcon className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── History Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HistoryIcon className="h-5 w-5 text-violet-500" />
              {dialogTitle}
            </DialogTitle>
            <DialogDescription>
              Klik tab untuk melihat riwayat kredit, generate, atau pembayaran Anda.
            </DialogDescription>
          </DialogHeader>
          {dialogOpen && (
            <HistoryDialogContent
              dialogType={dialogType}
              defaultTab={defaultTab}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ─── Recent Activity (fetches from credit_transactions) ─── */
function RecentActivity() {
  const [items, setItems] = useState<CreditItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard/history?tab=credits&limit=5")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <HistoryIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">Belum ada aktivitas</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/50">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className={`text-[10px] font-semibold ${
              item.type === "deduct"
                ? "bg-gradient-to-br from-red-500/20 to-orange-500/20 text-red-600"
                : "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600"
            }`}>
              {item.type === "deduct" ? "−" : "+"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.description}</p>
            <p className="text-xs text-muted-foreground truncate">{featureLabel(item.feature)}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`text-xs font-bold tabular-nums ${item.amount < 0 ? "text-red-500" : "text-emerald-500"}`}>
              {item.amount > 0 ? "+" : ""}{item.amount}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ClockIcon className="h-2.5 w-2.5" />
              {formatTimeAgo(item.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
