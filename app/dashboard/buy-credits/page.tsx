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
  ShieldCheckIcon,
  GiftIcon,
  StarIcon,
  ArrowRightIcon,
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

const TIERS: Record<string, { icon: React.ReactNode; gradient: string; glow: string; ring: string; bg: string }> = {
  Starter: {
    icon: <ZapIcon className="h-6 w-6" />,
    gradient: "from-slate-400 to-slate-500",
    glow: "group-hover:shadow-slate-500/25",
    ring: "ring-slate-500/30",
    bg: "bg-slate-500/10",
  },
  Basic: {
    icon: <SparklesIcon className="h-6 w-6" />,
    gradient: "from-sky-400 to-blue-500",
    glow: "group-hover:shadow-blue-500/25",
    ring: "ring-blue-500/30",
    bg: "bg-blue-500/10",
  },
  Pro: {
    icon: <RocketIcon className="h-6 w-6" />,
    gradient: "from-violet-500 to-purple-600",
    glow: "group-hover:shadow-violet-500/30",
    ring: "ring-violet-500/40",
    bg: "bg-violet-500/10",
  },
  Business: {
    icon: <CrownIcon className="h-6 w-6" />,
    gradient: "from-amber-400 to-orange-500",
    glow: "group-hover:shadow-amber-500/25",
    ring: "ring-amber-500/30",
    bg: "bg-amber-500/10",
  },
  Enterprise: {
    icon: <BuildingIcon className="h-6 w-6" />,
    gradient: "from-rose-500 to-pink-600",
    glow: "group-hover:shadow-rose-500/25",
    ring: "ring-rose-500/30",
    bg: "bg-rose-500/10",
  },
}

const DEFAULT_TIER = {
  icon: <CoinsIcon className="h-6 w-6" />,
  gradient: "from-violet-500 to-blue-500",
  glow: "group-hover:shadow-violet-500/20",
  ring: "ring-violet-500/30",
  bg: "bg-violet-500/10",
}

export default function BuyCreditsPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [snapReady, setSnapReady] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)

  // Promo code states
  const [promoInput, setPromoInput] = useState("")
  const [validatingPromo, setValidatingPromo] = useState(false)
  const [activePromo, setActivePromo] = useState<{ code: string; type: string; value: number } | null>(null)

  const { balance, refresh: refreshCredits } = useCredits()

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

  useEffect(() => { fetchPackages() }, [fetchPackages])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = (message: string, type: "success" | "error" | "info") => setToast({ message, type })

  const handleValidatePromo = async () => {
    if (!promoInput.trim()) return
    setValidatingPromo(true)
    try {
      const res = await fetch(`/api/credits/promo-validate?code=${encodeURIComponent(promoInput)}`)
      const data = await res.json()
      if (res.ok && data.isValid) {
        setActivePromo({
          code: data.code,
          type: data.discountType,
          value: data.discountValue
        })
        showToast(data.message, "success")
      } else {
        setActivePromo(null)
        showToast(data.message || data.error || "Kode promo tidak valid", "error")
      }
    } catch {
      setActivePromo(null)
      showToast("Gagal memvalidasi kode promo", "error")
    } finally {
      setValidatingPromo(false)
    }
  }

  const clearPromo = () => {
    setPromoInput("")
    setActivePromo(null)
  }

  const calculateDiscountedPrice = (price: number) => {
    if (!activePromo) return price
    let discount = 0
    if (activePromo.type === "percent") {
      discount = Math.floor((price * activePromo.value) / 100)
    } else if (activePromo.type === "nominal") {
      discount = activePromo.value
    }
    return Math.max(0, price - discount)
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
        body: JSON.stringify({ 
          packageId: pkg.id,
          promoCode: activePromo ? activePromo.code : undefined
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        showToast(err.error || "Gagal membuat pembayaran", "error")
        return
      }

      const { token } = await res.json()
      window.snap!.pay(token, {
        onSuccess: () => {
          showToast(`Pembayaran berhasil! ${pkg.credits + pkg.bonusCredits} credits ditambahkan.`, "success")
          refreshCredits()
          if (activePromo) clearPromo()
        },
        onPending: () => showToast("Menunggu pembayaran...", "info"),
        onError: () => showToast("Pembayaran gagal. Silakan coba lagi.", "error"),
        onClose: () => {},
      })
    } catch {
      showToast("Terjadi kesalahan. Silakan coba lagi.", "error")
    } finally {
      setPurchasing(null)
    }
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price)

  const pricePerCredit = (pkg: CreditPackage) => Math.round(pkg.price / (pkg.credits + pkg.bonusCredits))

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Beli Credits" },
      ]} />

      {/* Midtrans Snap.js */}
      <Script
        src={SNAP_JS_URL}
        data-client-key={MIDTRANS_CLIENT_KEY}
        onReady={() => setSnapReady(true)}
        strategy="lazyOnload"
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

          {/* ── Hero ── */}
          <div className="relative mb-12 text-center">
            {/* Decorative glow */}
            <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-40 w-80 rounded-full bg-violet-500/15 blur-[100px]" />

            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2.5 rounded-2xl border border-violet-500/20 bg-violet-500/10 px-5 py-2.5 backdrop-blur-sm">
                <CoinsIcon className="h-5 w-5 text-violet-400" />
                <span className="text-sm text-muted-foreground">Saldo Anda</span>
                <span className="text-lg font-black text-foreground">{(balance ?? 0).toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">credits</span>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Top Up Credits
              </h1>
              <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
                Pilih paket yang sesuai kebutuhan. Semakin besar paket, semakin banyak bonus!
              </p>
            </div>
          </div>

          {/* ── Usage Info Cards ── */}
          <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                <ImageIcon className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gambar AI</p>
                <p className="text-sm font-bold text-foreground">{CREDIT_COST_IMAGE} credits</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                <VideoIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Video AI</p>
                <p className="text-sm font-bold text-foreground">{CREDIT_COST_VIDEO} credits</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
                <ShieldCheckIcon className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pembayaran</p>
                <p className="text-sm font-bold text-foreground">100% Aman</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                <ZapIcon className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aktivasi</p>
                <p className="text-sm font-bold text-foreground">Instant</p>
              </div>
            </div>
          </div>

          {/* ── Promo Code Input ── */}
          <div className="mb-8 mx-auto max-w-xl">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/60 p-2 backdrop-blur-sm shadow-sm transition-all focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/20">
              <GiftIcon className="ml-3 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Punya Kode Promo?"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                disabled={activePromo !== null || validatingPromo}
                className="flex-1 bg-transparent px-2 py-2 text-sm font-bold uppercase tracking-wider text-foreground outline-none placeholder:font-normal placeholder:normal-case placeholder:text-muted-foreground disabled:opacity-50"
              />
              {activePromo ? (
                <button
                  onClick={clearPromo}
                  className="rounded-xl bg-red-500/10 px-4 py-2 text-xs font-bold text-red-500 transition-colors hover:bg-red-500/20"
                >
                  Batal
                </button>
              ) : (
                <button
                  onClick={handleValidatePromo}
                  disabled={!promoInput.trim() || validatingPromo}
                  className="flex min-w-24 items-center justify-center rounded-xl bg-violet-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
                >
                  {validatingPromo ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "Terapkan"}
                </button>
              )}
            </div>
            {activePromo && (
              <p className="mt-2 text-center text-sm font-medium text-green-500 animate-fade-up">
                ✓ Promo <strong>{activePromo.code}</strong> aktif! Diskon {activePromo.type === "percent" ? `${activePromo.value}%` : formatPrice(activePromo.value)} telah diterapkan.
              </p>
            )}
          </div>

          {/* ── Packages ── */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mb-12 mx-auto max-w-5xl grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => {
                const tier = TIERS[pkg.name] || DEFAULT_TIER
                const totalCredits = pkg.credits + pkg.bonusCredits
                const imagesCount = Math.floor(totalCredits / CREDIT_COST_IMAGE)
                const videosCount = Math.floor(totalCredits / CREDIT_COST_VIDEO)

                return (
                  <div
                    key={pkg.id}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
                      pkg.isPopular
                        ? `border-violet-500/50 shadow-xl shadow-violet-500/20 ring-1 ${tier.ring}`
                        : "border-border hover:border-muted-foreground/30",
                      tier.glow
                    )}
                  >
                    {/* Popular badge */}
                    {pkg.isPopular && (
                      <div className="absolute inset-x-0 top-0 flex justify-center">
                        <div className="flex items-center gap-1 rounded-b-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                          <StarIcon className="h-3 w-3" /> Paling Populer
                        </div>
                      </div>
                    )}

                    {/* Discount badge */}
                    {pkg.discountPercent > 0 && (
                      <div className="absolute right-3 top-3 z-10 rounded-full bg-green-500/20 px-2.5 py-0.5 text-[10px] font-bold text-green-400 backdrop-blur-sm">
                        -{pkg.discountPercent}%
                      </div>
                    )}

                    {/* Icon + Name */}
                    <div className={cn("flex flex-col items-center px-5 pb-3", pkg.isPopular ? "pt-9" : "pt-7")}>
                      <div className={cn(
                        "mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl",
                        tier.gradient
                      )}>
                        {tier.icon}
                      </div>
                      <h3 className="text-lg font-bold text-foreground">{pkg.name}</h3>
                      {pkg.description && (
                        <p className="mt-0.5 text-center text-[11px] text-muted-foreground">{pkg.description}</p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex flex-col items-center border-t border-border/50 px-5 py-4">
                      {activePromo ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-muted-foreground line-through decoration-red-500/50">
                              {formatPrice(pkg.price)}
                            </span>
                            <span className="text-xs font-bold text-green-500">
                              -{activePromo.type === "percent" ? `${activePromo.value}%` : formatPrice(activePromo.value)}
                            </span>
                          </div>
                          <span className="text-3xl font-black tracking-tight text-green-400 drop-shadow-sm">
                            {formatPrice(calculateDiscountedPrice(pkg.price))}
                          </span>
                        </>
                      ) : (
                        <span className="text-3xl font-black tracking-tight text-foreground">{formatPrice(pkg.price)}</span>
                      )}
                      <span className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatPrice(pricePerCredit(pkg))} per credit
                      </span>
                    </div>

                    {/* Credits */}
                    <div className="flex flex-col items-center px-5 pb-3">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-foreground">{pkg.credits.toLocaleString()}</span>
                        <span className="text-xs font-medium text-muted-foreground">credits</span>
                      </div>
                      {pkg.bonusCredits > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-400">
                          <GiftIcon className="h-3.5 w-3.5" />
                          +{pkg.bonusCredits.toLocaleString()} bonus gratis
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <div className="flex-1 px-5 pb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckIcon className="h-3.5 w-3.5 shrink-0 text-green-400" />
                          <span>Setara {imagesCount.toLocaleString()} gambar AI</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckIcon className="h-3.5 w-3.5 shrink-0 text-green-400" />
                          <span>Setara {videosCount.toLocaleString()} video AI</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckIcon className="h-3.5 w-3.5 shrink-0 text-green-400" />
                          <span>Credits tidak pernah expired</span>
                        </div>
                      </div>
                    </div>

                    {/* Buy button */}
                    <div className="px-5 pb-5">
                      <button
                        onClick={() => handlePurchase(pkg)}
                        disabled={purchasing !== null}
                        className={cn(
                          "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all duration-300",
                          pkg.isPopular
                            ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:brightness-110"
                            : `${tier.bg} text-foreground hover:brightness-125 border border-border/50`,
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
                            Beli Sekarang
                            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── FAQ/Info ── */}
          <div className="mb-8 rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-bold text-foreground">Pertanyaan Umum</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Bagaimana cara pembayaran?</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Kami menggunakan Midtrans untuk pembayaran yang aman. Mendukung transfer bank, e-wallet (GoPay, OVO, DANA), dan kartu kredit.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Apakah credits bisa expired?</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Tidak. Credits Anda tidak akan pernah expired dan bisa digunakan kapan saja tanpa batas waktu.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Berapa lama proses top-up?</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Credits langsung ditambahkan otomatis setelah pembayaran berhasil. Prosesnya instan!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
          <div className={cn(
            "flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl",
            toast.type === "success" ? "border-green-500/30 bg-green-500/15 text-green-400"
              : toast.type === "error" ? "border-red-500/30 bg-red-500/15 text-red-400"
              : "border-blue-500/30 bg-blue-500/15 text-blue-400"
          )}>
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
