"use client"

import { useState, useEffect } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ImageIcon,
  VideoIcon,
  SparklesIcon,
  ArrowUpRightIcon,
  StarIcon,
  CoinsIcon,
} from "lucide-react"

/* ─── stat card types ─── */
interface StatConfig {
  key: string
  title: string
  icon: typeof ImageIcon
  gradient: string
  iconBg: string
}

const statConfigs: StatConfig[] = [
  {
    key: "images",
    title: "Total Gambar",
    icon: ImageIcon,
    gradient: "from-violet-500/20 to-purple-500/20",
    iconBg: "bg-violet-500/10 text-violet-500",
  },
  {
    key: "videos",
    title: "Total Video",
    icon: VideoIcon,
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconBg: "bg-blue-500/10 text-blue-500",
  },
  {
    key: "credits",
    title: "Kredit Terpakai",
    icon: CoinsIcon,
    gradient: "from-amber-500/20 to-orange-500/20",
    iconBg: "bg-amber-500/10 text-amber-500",
  },
  {
    key: "gallery",
    title: "Item di Gallery",
    icon: SparklesIcon,
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconBg: "bg-emerald-500/10 text-emerald-500",
  },
]

/* ─── top models ─── */
const topModels = [
  { name: "Imagen 4", usage: 82, requests: "4,291", color: "bg-violet-500" },
  { name: "Veo 3.1 Fast", usage: 64, requests: "3,180", color: "bg-blue-500" },
  { name: "Nano Banana Pro", usage: 51, requests: "2,540", color: "bg-cyan-500" },
  { name: "Nano Banana 2", usage: 43, requests: "2,105", color: "bg-amber-500" },
]

/* ─── quick actions — from shared constants ─── */
import { DASHBOARD_FEATURES } from "@/lib/features"

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
  return String(n)
}

/* ─── Main Page ─── */
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

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

            return (
              <Card
                key={config.key}
                className="relative overflow-hidden border py-5 transition-all duration-300"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="text-sm font-medium">{config.title}</CardDescription>
                  <div className={`rounded-lg p-2 ${config.iconBg}`}>
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
              </Card>
            )
          })}
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
    </>
  )
}
