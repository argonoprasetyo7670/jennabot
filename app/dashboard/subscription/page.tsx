"use client"

import { useState, useEffect, useCallback } from "react"
import Script from "next/script"
import {
  CrownIcon,
  SparklesIcon,
  ZapIcon,
  RocketIcon,
  CheckIcon,
  Loader2Icon,
  CalendarIcon,
  ClockIcon,
  ShieldCheckIcon,
  InfinityIcon,
  ArrowRightIcon,
  GiftIcon,
  StarIcon,
  ImageIcon,
  VideoIcon,
  LayersIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardHeader } from "@/components/dashboard-header"
import { useSubscription } from "@/contexts/subscription"

/* ─── Types ─── */
interface SubscriptionPlan {
  id: string
  name: string
  price: number
  duration: number
  features: string[]
  isActive: boolean
  isPopular: boolean
  discountPercent: number
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

const TIER_STYLES: Record<string, { icon: React.ReactNode; gradient: string; glow: string; ring: string; bg: string; accent: string }> = {
  Starter: {
    icon: <ZapIcon className="h-6 w-6" />,
    gradient: "from-sky-400 to-blue-500",
    glow: "group-hover:shadow-blue-500/30",
    ring: "ring-blue-500/40",
    bg: "bg-blue-500/10",
    accent: "text-blue-400",
  },
  Pro: {
    icon: <RocketIcon className="h-6 w-6" />,
    gradient: "from-violet-500 to-purple-600",
    glow: "group-hover:shadow-violet-500/30",
    ring: "ring-violet-500/40",
    bg: "bg-violet-500/10",
    accent: "text-violet-400",
  },
  Business: {
    icon: <CrownIcon className="h-6 w-6" />,
    gradient: "from-amber-400 to-orange-500",
    glow: "group-hover:shadow-amber-500/30",
    ring: "ring-amber-500/40",
    bg: "bg-amber-500/10",
    accent: "text-amber-400",
  },
}

const DEFAULT_STYLE = {
  icon: <SparklesIcon className="h-6 w-6" />,
  gradient: "from-violet-500 to-blue-500",
  glow: "group-hover:shadow-violet-500/20",
  ring: "ring-violet-500/30",
  bg: "bg-violet-500/10",
  accent: "text-violet-400",
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  "Unlimited image generation": <ImageIcon className="h-3.5 w-3.5 shrink-0 text-green-400" />,
  "Unlimited video generation": <VideoIcon className="h-3.5 w-3.5 shrink-0 text-green-400" />,
  "Semua AI tools": <LayersIcon className="h-3.5 w-3.5 shrink-0 text-green-400" />,
  "Sistem antrean": <ClockIcon className="h-3.5 w-3.5 shrink-0 text-green-400" />,
  "Priority support": <ShieldCheckIcon className="h-3.5 w-3.5 shrink-0 text-green-400" />,
}

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [snapReady, setSnapReady] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  // Promo code states
  const [promoInput, setPromoInput] = useState("")
  const [validatingPromo, setValidatingPromo] = useState(false)
  const [activePromo, setActivePromo] = useState<{ code: string; type: string; value: number } | null>(null)

  const { subscription, isSubscribed, refresh: refreshSubscription } = useSubscription()

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription/plans")
      if (res.ok) {
        const data = await res.json()
        setPlans(data.plans || [])
        const popular = data.plans?.find((p: SubscriptionPlan) => p.isPopular)
        if (popular) {
          setSelectedPlanId(popular.id)
        } else if (data.plans?.length > 0) {
          setSelectedPlanId(data.plans[0].id)
        }
      }
    } catch {
      console.error("Failed to fetch plans")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

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
        setActivePromo({ code: data.code, type: data.discountType, value: data.discountValue })
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

  const handlePurchase = async (plan: SubscriptionPlan) => {
    if (purchasing) return
    if (!snapReady || !window.snap) {
      showToast("Sistem pembayaran sedang dimuat, coba lagi...", "info")
      return
    }

    setPurchasing(plan.id)
    try {
      const res = await fetch("/api/subscription/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          promoCode: activePromo ? activePromo.code : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        showToast(err.error || "Gagal membuat pembayaran", "error")
        return
      }

      const data = await res.json()

      // Free subscription (100% promo)
      if (data.token === "FREE") {
        showToast(`Langganan ${plan.name} berhasil diaktifkan! 🎉`, "success")
        refreshSubscription()
        window.dispatchEvent(new CustomEvent("subscription-updated"))
        if (activePromo) clearPromo()
        return
      }

      window.snap!.pay(data.token, {
        onSuccess: () => {
          showToast(`Langganan ${plan.name} berhasil diaktifkan! 🎉`, "success")
          refreshSubscription()
          window.dispatchEvent(new CustomEvent("subscription-updated"))
          if (activePromo) clearPromo()
        },
        onPending: () => showToast("Menunggu pembayaran...", "info"),
        onError: () => showToast("Pembayaran gagal. Silakan coba lagi.", "error"),
        onClose: () => { },
      })
    } catch {
      showToast("Terjadi kesalahan. Silakan coba lagi.", "error")
    } finally {
      setPurchasing(null)
    }
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col bg-background">
      <DashboardHeader breadcrumbs={[
        { label: "Jenna Bot Pro", href: "/dashboard" },
        { label: "Langganan" },
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
          <div className="relative mb-10 text-center">
            <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-40 w-80 rounded-full bg-violet-500/15 blur-[100px]" />

            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2.5 rounded-2xl border border-violet-500/20 bg-violet-500/10 px-5 py-2.5 backdrop-blur-sm">
                <CrownIcon className="h-5 w-5 text-violet-400" />
                <span className="text-sm font-semibold text-foreground">Langganan Premium</span>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Akses Unlimited
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground">
                Berlangganan untuk akses unlimited ke semua fitur AI. Tanpa batas, tanpa khawatir kehabisan kredit.
              </p>
            </div>
          </div>

          {/* ── Active Subscription Banner ── */}
          {isSubscribed && subscription && (
            <div className="mb-10 mx-auto max-w-2xl">
              <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-blue-500/10 p-6 backdrop-blur-sm">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

                <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25">
                    <CrownIcon className="h-7 w-7" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground">
                        Paket {subscription.plan}
                      </h3>
                      <span className="rounded-full bg-green-500/20 px-2.5 py-0.5 text-[10px] font-bold text-green-400">
                        Aktif
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        Berakhir: {formatDate(subscription.endDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {subscription.daysRemaining} hari tersisa
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-violet-500/10 px-4 py-2 border border-violet-500/20">
                    <InfinityIcon className="h-5 w-5 text-violet-400" />
                    <span className="text-sm font-bold text-violet-400">Unlimited</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Feature Highlights ── */}
          <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                <InfinityIcon className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Generate</p>
                <p className="text-sm font-bold text-foreground">Unlimited</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                <ImageIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gambar & Video</p>
                <p className="text-sm font-bold text-foreground">Tanpa Batas</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
                <ShieldCheckIcon className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kredit</p>
                <p className="text-sm font-bold text-foreground">Tidak Dipotong</p>
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

          {/* ── Plans ── */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mb-12 mx-auto max-w-5xl grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const style = TIER_STYLES[plan.name] || DEFAULT_STYLE
                const pricePerDay = Math.round(plan.price / plan.duration)
                const isCurrentPlan = isSubscribed && subscription?.plan === plan.name
                const isSelected = selectedPlanId === plan.id

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer",
                      isSelected
                        ? `border-violet-500/50 shadow-xl shadow-violet-500/20 ring-1 ${style.ring}`
                        : "border-border hover:border-muted-foreground/30",
                      isCurrentPlan && "ring-2 ring-green-500/50 border-green-500/30",
                      style.glow
                    )}
                  >
                    {/* Popular badge */}
                    {plan.isPopular && (
                      <div className="absolute inset-x-0 top-0 flex justify-center">
                        <div className="flex items-center gap-1 rounded-b-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                          <StarIcon className="h-3 w-3" /> Paling Populer
                        </div>
                      </div>
                    )}

                    {/* Current plan badge */}
                    {isCurrentPlan && (
                      <div className="absolute right-3 top-3 z-10 rounded-full bg-green-500/20 px-2.5 py-0.5 text-[10px] font-bold text-green-400 backdrop-blur-sm">
                        Aktif
                      </div>
                    )}

                    {/* Icon + Name */}
                    <div className={cn("flex flex-col items-center px-5 pb-3", plan.isPopular ? "pt-9" : "pt-7")}>
                      <div className={cn(
                        "mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl",
                        style.gradient
                      )}>
                        {style.icon}
                      </div>
                      <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                      <p className="mt-0.5 text-center text-xs text-muted-foreground">
                        {plan.duration} hari akses unlimited
                      </p>
                    </div>

                    {/* Price */}
                    <div className="flex flex-col items-center border-t border-border/50 px-5 py-4">
                      {activePromo ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-muted-foreground line-through decoration-red-500/50">
                              {formatPrice(plan.price)}
                            </span>
                            <span className="text-xs font-bold text-green-500">
                              -{activePromo.type === "percent" ? `${activePromo.value}%` : formatPrice(activePromo.value)}
                            </span>
                          </div>
                          <span className="text-3xl font-black tracking-tight text-green-400 drop-shadow-sm">
                            {formatPrice(calculateDiscountedPrice(plan.price))}
                          </span>
                        </>
                      ) : (
                        <span className="text-3xl font-black tracking-tight text-foreground">{formatPrice(plan.price)}</span>
                      )}
                      <span className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatPrice(pricePerDay)} / hari
                      </span>
                    </div>

                    {/* Duration highlight */}
                    <div className="flex justify-center px-5 pb-3">
                      <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", style.bg, style.accent)}>
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {plan.duration} Hari
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex-1 px-5 pb-4">
                      <div className="space-y-2">
                        {plan.features.map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            {FEATURE_ICONS[feature] || <CheckIcon className="h-3.5 w-3.5 shrink-0 text-green-400" />}
                            <span>{feature}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <InfinityIcon className="h-3.5 w-3.5 shrink-0 text-green-400" />
                          <span>Unlimited generate tanpa potong kredit</span>
                        </div>
                      </div>
                    </div>

                    {/* Buy button */}
                    <div className="px-5 pb-5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedPlanId(plan.id)
                          handlePurchase(plan)
                        }}
                        disabled={purchasing !== null || isCurrentPlan}
                        className={cn(
                          "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all duration-300",
                          isCurrentPlan
                            ? "bg-green-500/10 text-green-400 border border-green-500/30 cursor-default"
                            : isSelected
                              ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:brightness-110"
                              : `${style.bg} text-foreground hover:brightness-125 border border-border/50`,
                          purchasing === plan.id && "opacity-70 cursor-wait"
                        )}
                      >
                        {isCurrentPlan ? (
                          <>
                            <CheckIcon className="h-4 w-4" />
                            Paket Aktif
                          </>
                        ) : purchasing === plan.id ? (
                          <>
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                            Memproses...
                          </>
                        ) : (
                          <>
                            Berlangganan
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

          {/* ── How it works ── */}
          <div className="mb-8 rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-bold text-foreground">Bagaimana Cara Kerjanya?</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Apa itu langganan?</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Langganan memberikan akses unlimited ke semua fitur AI tanpa memotong kredit Anda selama masa aktif.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Bagaimana dengan kredit saya?</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Kredit Anda tetap aman. Selama berlangganan, kredit tidak akan dipotong. Setelah langganan habis, kredit digunakan sebagai fallback.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Apakah otomatis perpanjang?</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Tidak. Langganan harus diperpanjang secara manual setelah masa berlaku habis. Anda akan menerima pengingat.
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
