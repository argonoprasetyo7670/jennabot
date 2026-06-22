"use client"

import { useEffect, useState } from "react"
import { CheckIcon } from "./Icons"

interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
  bonusCredits: number
  discountPercent: number
  description: string
  isPopular: boolean
}

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

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)
}

export default function PricingSection() {
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [subs, setSubs] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<"credits" | "subscription">("subscription")

  useEffect(() => {
    Promise.all([
      fetch("/api/credits/packages/public").then((r) => r.json()),
      fetch("/api/subscription/plans").then((r) => r.json()),
    ])
      .then(([creditsData, subsData]) => {
        setPackages(creditsData.packages || [])
        setSubs(subsData.plans || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card animate-pulse rounded-3xl p-8 h-72" />
        ))}
      </div>
    )
  }

  if (packages.length === 0 && subs.length === 0) return null

  return (
    <div className="mt-10">
      <div className="mb-10 flex justify-center">
        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur">
          <button
            onClick={() => setMode("subscription")}
            className={`rounded-full px-6 py-2 text-sm font-semibold transition-all ${
              mode === "subscription"
                ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25"
                : "text-white/50 hover:text-white"
            }`}
          >
            Langganan (Unlimited)
          </button>
          <button
            onClick={() => setMode("credits")}
            className={`rounded-full px-6 py-2 text-sm font-semibold transition-all ${
              mode === "credits"
                ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25"
                : "text-white/50 hover:text-white"
            }`}
          >
            Sistem Kredit
          </button>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {mode === "credits" && packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`relative rounded-3xl p-8 transition-transform duration-300 hover:-translate-y-1 ${
              pkg.isPopular
                ? "pricing-popular backdrop-blur"
                : "glass-card"
            }`}
          >
            {pkg.isPopular && (
              <span className="absolute -top-3 right-6 rounded-full bg-violet-500/90 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-violet-500/30">
                Populer
              </span>
            )}

            <p className={`text-xs font-semibold uppercase tracking-wider ${pkg.isPopular ? "text-violet-400" : "text-white/40"}`}>
              {pkg.name}
            </p>

            <h3 className="font-display mt-3 text-3xl font-bold">
              {formatRupiah(pkg.price)}
            </h3>

            <p className="mt-2 text-sm leading-6 text-white/45">{pkg.description}</p>

            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <p className="text-sm text-white/60">
                  {pkg.credits.toLocaleString("id-ID")} poin kredit
                </p>
              </div>
              {pkg.bonusCredits > 0 && (
                <div className="flex items-start gap-3">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <p className="text-sm text-white/60">
                    +{pkg.bonusCredits.toLocaleString("id-ID")} bonus poin
                  </p>
                </div>
              )}
              {pkg.discountPercent > 0 && (
                <div className="flex items-start gap-3">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <p className="text-sm text-white/60">
                    Hemat {pkg.discountPercent}%
                  </p>
                </div>
              )}
              <div className="flex items-start gap-3">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <p className="text-sm text-white/60">Semua AI tools</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <p className="text-sm text-white/60">Gallery & download</p>
              </div>
            </div>

            <a
              href="#auth-section"
              className={`mt-8 flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold text-white transition ${
                pkg.isPopular
                  ? "btn-glow"
                  : "border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
              }`}
            >
              {pkg.isPopular ? "Pilih paket ini" : "Beli sekarang"}
            </a>
          </div>
        ))}

        {mode === "subscription" && subs.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-3xl p-8 transition-transform duration-300 hover:-translate-y-1 ${
              plan.isPopular ? "pricing-popular backdrop-blur" : "glass-card"
            }`}
          >
            {plan.isPopular && (
              <span className="absolute -top-3 right-6 rounded-full bg-violet-500/90 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-violet-500/30">
                Populer
              </span>
            )}

            <p className={`text-xs font-semibold uppercase tracking-wider ${plan.isPopular ? "text-violet-400" : "text-white/40"}`}>
              {plan.name}
            </p>

            <h3 className="font-display mt-3 text-3xl font-bold flex flex-wrap items-baseline gap-1">
              {formatRupiah(plan.price)}
              <span className="text-sm font-normal text-white/50">/ {plan.duration} hari</span>
            </h3>

            <p className="mt-2 text-sm leading-6 text-white/45">Akses unlimited selama {plan.duration} hari.</p>

            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <p className="text-sm text-white/60">Generate tanpa batas</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <p className="text-sm text-white/60">Kredit tidak terpotong</p>
              </div>
              {plan.features
                .filter(feat => !feat.includes("Unlimited") && !feat.includes("tanpa potong"))
                .map((feat, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <p className="text-sm text-white/60">{feat}</p>
                  </div>
                ))}
            </div>

            <a
              href="#auth-section"
              className={`mt-8 flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold text-white transition ${
                plan.isPopular ? "btn-glow" : "border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
              }`}
            >
              {plan.isPopular ? "Pilih paket ini" : "Mulai Langganan"}
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
