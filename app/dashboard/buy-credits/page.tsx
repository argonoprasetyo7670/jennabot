"use client"

import { useState, useEffect, useCallback } from "react"
import Script from "next/script"
import {
  CoinsIcon,
  SparklesIcon,
  ZapIcon,
  CrownIcon,
  RocketIcon,
  BuildingIcon,
  CheckIcon,
  Loader2Icon,
  ImageIcon,
  VideoIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  GiftIcon,
  HistoryIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardHeader } from "@/components/dashboard-header"
import { useCredits } from "@/contexts/credits"
import { CREDIT_COST_IMAGE, CREDIT_COST_VIDEO } from "@/contexts/generation-queue"

/* ─── Types ─── */
interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
  bonusCredits: number
  discountPercent: number
  description: string | null
  isPopular: boolean
}

interface Transaction {
  id: string
  orderId: string
  plan: string
  amount: number
  status: string
  createdAt: string
}

/* ─── Midtrans Snap type ─── */
declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: Record<string, unknown>) => void
          onPending?: (result: Record<string, unknown>) => void
          onError?: (result: Record<string, unknown>) => void
          onClose?: () => void
        }
      ) => void
    }
  }
}

const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ""
const IS_PRODUCTION = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
const SNAP_JS_URL = IS_PRODUCTION
  ? "https://app.midtrans.com/snap/snap.js"
  : "https://app.sandbox.midtrans.com/snap/snap.js"

const PACKAGE_ICONS: Record<string, React.ReactNode> = {
  Starter: <ZapIcon className="h-6 w-6" />,
  Basic: <SparklesIcon className="h-6 w-6" />,
  Pro: <RocketIcon className="h-6 w-6" />,
  Business: <CrownIcon className="h-6 w-6" />,
  Enterprise: <BuildingIcon className="h-6 w-6" />,
}

const PACKAGE_GRADIENTS: Record<string, string> = {
  Starter: "from-slate-500 to-slate-600",
  Basic: "from-blue-500 to-cyan-500",
  Pro: "from-violet-500 to-purple-500",
  Business: "from-amber-500 to-orange-500",
  Enterprise: "from-rose-500 to-pink-500",
}

const PACKAGE_GLOWS: Record<string, string> = {
  Starter: "shadow-slate-500/20",
  Basic: "shadow-blue-500/20",
  Pro: "shadow-violet-500/30",
  Business: "shadow-amber-500/20",
  Enterprise: "shadow-rose-500/20",
}

export default function BuyCreditsPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [snapReady, setSnapReady] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)

  const { balance, refresh: refreshCredits } = useCredits()

  // Fetch packages
  const fetchPackages = useCallback(async () => {
    try {
      const res = await fetch("/api/credits/packages")
      if (res.ok) {
        const data = await res.json()
        setPackages(data.packages || [])
      }
    } catch {
      console.error("Failed to fetch packages")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch recent transactions
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/credits/transactions")
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions || [])
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    fetchPackages()
    fetchTransactions()
  }, [fetchPackages, fetchTransactions])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type })
  }

  const handlePurchase = async (pkg: CreditPackage) => {
    if (purchasing) return

    if (!snapReady || !window.snap) {
      showToast("Sistem pembayaran sedang dimuat, coba lagi...", "info")
      return
    }

    setPurchasing(pkg.id)

    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      })

      if (!res.ok) {
        const err = await res.json()
        showToast(err.error || "Gagal membuat pembayaran", "error")
        return
      }

      const { token } = await res.json()

      // Open Midtrans Snap popup
      window.snap!.pay(token, {
        onSuccess: () => {
          showToast(`Pembayaran berhasil! ${pkg.credits + pkg.bonusCredits} credits ditambahkan.`, "success")
          refreshCredits()
          fetchTransactions()
        },
        onPending: () => {
          showToast("Menunggu pembayaran...", "info")
          fetchTransactions()
        },
        onError: () => {
          showToast("Pembayaran gagal. Silakan coba lagi.", "error")
        },
        onClose: () => {
          // User closed the popup without completing
        },
      })
    } catch {
      showToast("Terjadi kesalahan. Silakan coba lagi.", "error")
    } finally {
      setPurchasing(null)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const pricePerCredit = (pkg: CreditPackage) => {
    const total = pkg.credits + pkg.bonusCredits
    return Math.round(pkg.price / total)
  }

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col bg-background">
      <DashboardHeader
        breadcrumbs={[
          { label: "Jenna Bot Pro", href: "/dashboard" },
          { label: "Beli Credits" },
        ]}
      />

      {/* Midtrans Snap.js */}
      <Script
        src={SNAP_JS_URL}
        data-client-key={MIDTRANS_CLIENT_KEY}
        onReady={() => setSnapReady(true)}
        strategy="lazyOnload"
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

          {/* ── Hero Section ── */}
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-400">
              <CoinsIcon className="h-4 w-4" />
              Saldo Anda: <span className="font-bold">{balance.toLocaleString()} credits</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              Beli Credits
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              Pilih paket yang sesuai kebutuhan Anda. Semakin banyak, semakin hemat!
            </p>
          </div>

          {/* ── Usage Estimator ── */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-2.5 backdrop-blur-sm">
              <ImageIcon className="h-4 w-4 text-violet-400" />
              <span className="text-sm text-muted-foreground">1 Gambar AI =</span>
              <span className="text-sm font-bold text-foreground">{CREDIT_COST_IMAGE} credits</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-2.5 backdrop-blur-sm">
              <VideoIcon className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-muted-foreground">1 Video AI =</span>
              <span className="text-sm font-bold text-foreground">{CREDIT_COST_VIDEO} credits</span>
            </div>
          </div>

          {/* ── Packages Grid ── */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {packages.map((pkg) => {
                const gradient = PACKAGE_GRADIENTS[pkg.name] || "from-violet-500 to-blue-500"
                const glow = PACKAGE_GLOWS[pkg.name] || "shadow-violet-500/20"
                const icon = PACKAGE_ICONS[pkg.name] || <CoinsIcon className="h-6 w-6" />
                const totalCredits = pkg.credits + pkg.bonusCredits
                const imagesCount = Math.floor(totalCredits / CREDIT_COST_IMAGE)
                const videosCount = Math.floor(totalCredits / CREDIT_COST_VIDEO)

                return (
                  <div
                    key={pkg.id}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm transition-all duration-300",
                      pkg.isPopular
                        ? "border-violet-500/50 shadow-xl shadow-violet-500/20 scale-[1.02] ring-1 ring-violet-500/30"
                        : "border-border hover:border-border/80 hover:shadow-lg",
                      `hover:${glow}`
                    )}
                  >
                    {/* Popular badge */}
                    {pkg.isPopular && (
                      <div className="absolute -right-8 top-5 z-10 rotate-45 bg-gradient-to-r from-violet-500 to-purple-500 px-10 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                        Populer
                      </div>
                    )}

                    {/* Discount badge */}
                    {pkg.discountPercent > 0 && (
                      <div className="absolute left-3 top-3 z-10 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">
                        Hemat {pkg.discountPercent}%
                      </div>
                    )}

                    {/* Icon header */}
                    <div className="flex flex-col items-center px-5 pt-7 pb-4">
                      <div
                        className={cn(
                          "mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110",
                          gradient,
                          glow
                        )}
                      >
                        {icon}
                      </div>
                      <h3 className="text-lg font-bold text-foreground">{pkg.name}</h3>
                      {pkg.description && (
                        <p className="mt-1 text-center text-xs text-muted-foreground">{pkg.description}</p>
                      )}
                    </div>

                    {/* Credits */}
                    <div className="flex flex-col items-center border-t border-border/50 px-5 py-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-foreground">{pkg.credits.toLocaleString()}</span>
                        <span className="text-sm text-muted-foreground">credits</span>
                      </div>
                      {pkg.bonusCredits > 0 && (
                        <div className="mt-1.5 flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">
                          <GiftIcon className="h-3 w-3" />
                          +{pkg.bonusCredits} bonus
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex flex-col items-center px-5 pb-2">
                      <span className="text-2xl font-bold text-foreground">{formatPrice(pkg.price)}</span>
                      <span className="mt-1 text-[11px] text-muted-foreground">
                        {formatPrice(pricePerCredit(pkg))}/credit
                      </span>
                    </div>

                    {/* Features */}
                    <div className="flex-1 px-5 pb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckIcon className="h-3.5 w-3.5 shrink-0 text-green-400" />
                          <span>≈ {imagesCount} gambar AI</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckIcon className="h-3.5 w-3.5 shrink-0 text-green-400" />
                          <span>≈ {videosCount} video AI</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckIcon className="h-3.5 w-3.5 shrink-0 text-green-400" />
                          <span>Tidak ada expired</span>
                        </div>
                      </div>
                    </div>

                    {/* Buy button */}
                    <div className="px-5 pb-5">
                      <button
                        onClick={() => handlePurchase(pkg)}
                        disabled={purchasing !== null}
                        className={cn(
                          "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-300",
                          pkg.isPopular
                            ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:brightness-110"
                            : "bg-muted text-foreground hover:bg-muted/80",
                          purchasing === pkg.id && "opacity-70 cursor-wait"
                        )}
                      >
                        {purchasing === pkg.id ? (
                          <>
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                            Memproses...
                          </>
                        ) : (
                          <>
                            <CoinsIcon className="h-4 w-4" />
                            Beli Sekarang
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Trust Badges ── */}
          <div className="mb-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheckIcon className="h-5 w-5 text-green-400" />
              <span>Pembayaran Aman</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUpIcon className="h-5 w-5 text-blue-400" />
              <span>Credits Tidak Expired</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ZapIcon className="h-5 w-5 text-amber-400" />
              <span>Instant Top-up</span>
            </div>
          </div>

          {/* ── Recent Transactions ── */}
          {transactions.length > 0 && (
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-2">
                <HistoryIcon className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Riwayat Transaksi</h2>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-card/50 backdrop-blur-sm">
                <div className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-4 py-3 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{tx.plan}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground">{formatPrice(tx.amount)}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                            tx.status === "success"
                              ? "bg-green-500/15 text-green-400"
                              : tx.status === "pending"
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-red-500/15 text-red-400"
                          )}
                        >
                          {tx.status === "success" ? "Berhasil" : tx.status === "pending" ? "Menunggu" : "Gagal"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Toast notification ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl",
              toast.type === "success"
                ? "border-green-500/30 bg-green-500/15 text-green-400"
                : toast.type === "error"
                ? "border-red-500/30 bg-red-500/15 text-red-400"
                : "border-blue-500/30 bg-blue-500/15 text-blue-400"
            )}
          >
            {toast.type === "success" && <CheckIcon className="h-4 w-4" />}
            {toast.type === "error" && <span>✕</span>}
            {toast.type === "info" && <Loader2Icon className="h-4 w-4" />}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}
